import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Edit2, ChevronUp, ChevronDown, Loader2, FolderTree } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../api/categories.js";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import useConfirm from "../hooks/useConfirm.js";
import SectionEyebrow from "../components/SectionEyebrow.jsx";

let keySeed = 0;
const nextKey = () => `k${Date.now()}${keySeed++}`;

const blankDraft = () => ({ name: "", children: [] });
const blankNode = () => ({ _key: nextKey(), name: "", disabled: false, children: [] });

const nodesFromApi = (list) =>
  (list || []).map((n) => ({
    _key: nextKey(),
    name: n.name || "",
    disabled: !!n.disabled,
    children: nodesFromApi(n.children),
  }));

const draftFromDoc = (doc) => ({
  name: doc.name || "",
  children: nodesFromApi(doc.children),
});

const nodesToApi = (list) =>
  list.map((n) => ({
    name: n.name.trim(),
    disabled: !!n.disabled,
    children: nodesToApi(n.children),
  }));

const move = (arr, index, delta) => {
  const next = [...arr];
  const target = index + delta;
  if (target < 0 || target >= next.length) return arr;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** Recursively updates the node at `path` (an array of indices) within a children array. */
const updateAt = (nodes, path, fn) => {
  if (path.length === 1) {
    return nodes.map((n, i) => (i === path[0] ? fn(n) : n));
  }
  const [head, ...rest] = path;
  return nodes.map((n, i) => (i === head ? { ...n, children: updateAt(n.children, rest, fn) } : n));
};

const removeAt = (nodes, path) => {
  if (path.length === 1) return nodes.filter((_, i) => i !== path[0]);
  const [head, ...rest] = path;
  return nodes.map((n, i) => (i === head ? { ...n, children: removeAt(n.children, rest) } : n));
};

/** Flattens the tree into [name, name, ...] per sibling group, to check for blanks/duplicates at every level. */
const findProblem = (nodes, ancestorLabel) => {
  const seen = new Set();
  for (const n of nodes) {
    const name = n.name.trim().toLowerCase();
    if (!name) return `Every entry under "${ancestorLabel}" needs a name`;
    if (seen.has(name)) return `Names under "${ancestorLabel}" must be unique`;
    seen.add(name);
  }
  for (const n of nodes) {
    const sub = findProblem(n.children, n.name.trim() || "(unnamed)");
    if (sub) return sub;
  }
  return null;
};

const countAll = (nodes) => nodes.reduce((sum, n) => sum + 1 + countAll(n.children), 0);

/** One category node, rendering itself for each of its own children — this is what lets an
 * admin nest a subcategory under a subcategory to any depth, not just a fixed 2 levels. */
function CategoryNode({ node, path, depth, onUpdate, onRemove, onMove, canMoveUp, canMoveDown, onAddChild }) {
  return (
    <div className={depth > 0 ? "ml-4 pl-4 border-l border-rule" : ""}>
      <div className="flex items-center gap-2 py-1.5">
        <input
          className="field flex-1" value={node.name} autoComplete="off"
          onChange={(e) => onUpdate(path, (n) => ({ ...n, name: e.target.value }))}
          placeholder={depth === 0 ? "Category name" : "Subcategory name"}
        />
        {depth > 0 && (
          <label className="hidden sm:flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-graphite whitespace-nowrap select-none">
            <input
              type="checkbox" checked={node.disabled}
              onChange={(e) => onUpdate(path, (n) => ({ ...n, disabled: e.target.checked }))}
            />
            Coming soon
          </label>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" className="btn btn-ghost btn-sm !px-1.5" disabled={!canMoveUp} onClick={() => onMove(path, -1)} aria-label="Move up">
            <ChevronUp size={14} />
          </button>
          <button type="button" className="btn btn-ghost btn-sm !px-1.5" disabled={!canMoveDown} onClick={() => onMove(path, 1)} aria-label="Move down">
            <ChevronDown size={14} />
          </button>
          <button type="button" className="btn btn-danger btn-sm !px-1.5" onClick={() => onRemove(path)} aria-label="Remove">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="ml-4 flex flex-col gap-0.5">
        {node.children.map((child, i) => (
          <CategoryNode
            key={child._key}
            node={child}
            path={[...path, i]}
            depth={depth + 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onMove={onMove}
            canMoveUp={i > 0}
            canMoveDown={i < node.children.length - 1}
            onAddChild={onAddChild}
          />
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm self-start !text-[0.62rem] mt-1 mb-2"
          onClick={() => onAddChild(path)}
        >
          <Plus size={12} /> Add subcategory
        </button>
      </div>
    </div>
  );
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // "_id" | "new" | null
  const [draft, setDraft] = useState(blankDraft());
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getCategories();
      setCategories(items);
    } catch {
      toast.error("Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refetchAfter = async (fn) => { await fn(); await load(); };

  const startAdd = () => { setEditingId("new"); setDraft(blankDraft()); };
  const startEdit = (cat) => { setEditingId(cat._id); setDraft(draftFromDoc(cat)); };
  const cancelEdit = () => { setEditingId(null); setDraft(blankDraft()); };

  const updateNode = (path, fn) => setDraft((d) => ({ ...d, children: updateAt(d.children, path, fn) }));
  const removeNode = (path) => setDraft((d) => ({ ...d, children: removeAt(d.children, path) }));
  const moveNode = (path, delta) =>
    setDraft((d) =>
      path.length === 1
        ? { ...d, children: move(d.children, path[0], delta) }
        : { ...d, children: updateAt(d.children, path.slice(0, -1), (n) => ({ ...n, children: move(n.children, path[path.length - 1], delta) })) }
    );
  const addChildAt = (path) =>
    setDraft((d) =>
      path.length === 0
        ? { ...d, children: [...d.children, blankNode()] }
        : { ...d, children: updateAt(d.children, path, (n) => ({ ...n, children: [...n.children, blankNode()] })) }
    );

  const save = async () => {
    if (!draft.name.trim()) return toast.warning("Category name is required");
    const problem = findProblem(draft.children, draft.name.trim());
    if (problem) return toast.warning(problem);

    const payload = { name: draft.name.trim(), children: nodesToApi(draft.children) };

    setSaving(true);
    try {
      await refetchAfter(async () => {
        if (editingId === "new") {
          await createCategory(payload);
          toast.success("Category created");
        } else {
          await updateCategory(editingId, payload);
          toast.success("Category updated");
        }
      });
      cancelEdit();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = (cat) => confirm.ask({
    title: `Delete "${cat.name}"?`,
    description: "Products already saved under this category or its subcategories keep their stored label — they just won't show up under it in the shop menu or filters anymore. This cannot be undone.",
    item: { label: cat.name, meta: [["Subcategories", String(countAll(cat.children || []))]] },
    onConfirm: async () => {
      try {
        await refetchAfter(() => deleteCategory(cat._id));
        toast.success("Category deleted");
        if (editingId === cat._id) cancelEdit();
      } catch {
        toast.error("Delete failed");
      }
    },
  });

  const renderDraftForm = () => (
    <div className="panel p-6 flex flex-col gap-5 border-vermillion/40">
      <div>
        <label htmlFor="c-name" className="label-mono">Category name</label>
        <input
          id="c-name"
          className="field mt-1.5 text-[1rem]"
          style={{ fontFamily: "var(--font-display)" }}
          value={draft.name} autoComplete="off"
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Indian Products"
        />
      </div>

      <div>
        <span className="label-mono block mb-2">Subcategories</span>
        {draft.children.length === 0 && (
          <p className="text-[0.8rem] text-slate mb-2">No subcategories yet.</p>
        )}
        <div className="flex flex-col gap-0.5">
          {draft.children.map((child, i) => (
            <CategoryNode
              key={child._key}
              node={child}
              path={[i]}
              depth={1}
              onUpdate={updateNode}
              onRemove={removeNode}
              onMove={moveNode}
              canMoveUp={i > 0}
              canMoveDown={i < draft.children.length - 1}
              onAddChild={addChildAt}
            />
          ))}
          <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => addChildAt([])}>
            <Plus size={13} /> Add subcategory
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-rule">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save category"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionEyebrow />
          <h2 className="page-title">Categories</h2>
          <p className="text-[0.85rem] text-graphite mt-1.5 max-w-xl">
            Feeds the product form's category picker and the storefront's shop menu.
            Subcategories can nest as deep as you need — add a subcategory under a subcategory, and so on.
          </p>
        </div>
        {editingId === null && (
          <button className="btn btn-primary" onClick={startAdd}>
            <Plus size={15} /> Add category
          </button>
        )}
      </div>

      {editingId === "new" && <div className="mb-5">{renderDraftForm()}</div>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-paper-dim animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 && editingId !== "new" ? (
        <div className="panel py-20 text-center">
          <FolderTree size={26} className="mx-auto text-slate mb-4" />
          <p className="text-graphite mb-5">No categories yet.</p>
          <button className="btn btn-primary mx-auto" onClick={startAdd}>
            <Plus size={15} /> Add the first one
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {categories.map((cat, i) =>
            editingId === cat._id ? (
              <div key={cat._id}>{renderDraftForm()}</div>
            ) : (
              <div key={cat._id} className="panel p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-[0.62rem] text-vermillion tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="h-px w-8 bg-rule" />
                    </div>
                    <h3
                      className="text-[1.2rem] text-ink leading-tight"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                    >
                      {cat.name}
                    </h3>
                    <p className="text-[0.74rem] text-slate mt-1">
                      {countAll(cat.children || [])} total {countAll(cat.children || []) === 1 ? "entry" : "entries"} nested underneath
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button className="btn btn-ghost btn-sm !px-2" onClick={() => startEdit(cat)} aria-label={`Edit ${cat.name}`}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-danger btn-sm !px-2" onClick={() => removeCategory(cat)} aria-label={`Delete ${cat.name}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {(cat.children || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {cat.children.map((s) => (
                      <span
                        key={s._id}
                        className={`font-mono text-[0.6rem] uppercase tracking-[0.08em] px-2 py-1 border ${
                          s.disabled ? "border-rule text-slate/70" : "border-rule-strong text-graphite"
                        }`}
                      >
                        {s.name}{s.children?.length > 0 ? ` (${s.children.length})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      <ConfirmDialog {...confirm.props} />
    </div>
  );
};

export default CategoriesPage;
