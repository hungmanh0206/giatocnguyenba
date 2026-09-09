'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus,
  Minus,
  Scan,
  Maximize,
  Minimize,
  GitFork,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFamily } from './provider';
import { Avatar } from './home';
import { QuickView } from './members';
import { Choice, branchOptions, generationOptions, SearchBox } from './common';
import {
  branchName,
  relatives,
  searchMembers,
  type Member,
} from '@/lib/family';
import {
  collapsedDescendantGroups,
  layoutFamily,
  PERSON_HEIGHT,
  PERSON_WIDTH,
  PERSON_GAP,
  type Household,
} from '@/lib/tree-layout';
type FamilyNode = Node<
  {
    group: Household;
    selected: string | null;
    dimmed: string[];
    collapsed: boolean;
    hasChildren: boolean;
    select: (p: Member) => void;
    collapse: (id: string) => void;
  },
  'household'
>;
function HouseholdNode({ data }: NodeProps<FamilyNode>) {
  const { group } = data;
  return (
    <div className="household" style={{ width: group.width }}>
      {group.people.map((p, index) => (
        <div
          className="tree-person-wrap"
          style={{ width: PERSON_WIDTH }}
          key={p.id}
        >
          <Handle
            type="target"
            position={Position.Top}
            id={`child-${p.id}`}
            style={{
              left: index * (PERSON_WIDTH + PERSON_GAP) + PERSON_WIDTH / 2,
            }}
          />
          <button
            className={`tree-person nodrag nopan branch-${p.branch} ${data.selected === p.id ? 'chosen' : ''} ${data.dimmed.includes(p.id) ? 'dimmed' : ''}`}
            data-tree-person-id={p.id}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              data.select(p);
            }}
            aria-label={`${p.name}, đời ${p.generation}, ${branchName(p.branch)}`}
          >
            <div className="tree-person-top">
              <Avatar person={p} />
              <span className="branch-badge">{branchName(p.branch)}</span>
            </div>
            <strong>{p.name}</strong>
            <small>
              {p.born}
              {p.died ? ` – ${p.died}` : ' · Còn sống'}
            </small>
            <span className="tree-person-gen">Đời thứ {p.generation}</span>
          </button>
          {index < group.people.length - 1 &&
            p.spouses.includes(group.people[index + 1].id) && (
              <span className="spouse-connector" title="Quan hệ vợ chồng" />
            )}
        </div>
      ))}
      {group.people.map((p, index) => (
        <Handle
          type="source"
          key={p.id}
          position={Position.Bottom}
          id={`parent-${p.id}`}
          style={{
            left: index * (PERSON_WIDTH + PERSON_GAP) + PERSON_WIDTH / 2,
          }}
        />
      ))}
      {data.hasChildren && (
        <Button
          variant="outline"
          className="collapse-node nodrag nopan"
          title={data.collapsed ? 'Mở hậu duệ' : 'Thu gọn hậu duệ'}
          aria-label={data.collapsed ? 'Mở hậu duệ' : 'Thu gọn hậu duệ'}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            data.collapse(group.id);
          }}
        >
          {data.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </Button>
      )}
    </div>
  );
}
const nodeTypes = { household: HouseholdNode };
export function TreePage() {
  return (
    <ReactFlowProvider>
      <TreeCanvas />
    </ReactFlowProvider>
  );
}
function TreeCanvas() {
  const { members } = useFamily();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('all');
  const [generation, setGeneration] = useState('all');
  const [selected, setSelected] = useState<Member | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const flow = useReactFlow();
  const model = useMemo(() => layoutFamily(members), [members]);
  const allTreeNodes = useMemo(
    () => model.groups.map((group) => ({ id: group.id })),
    [model.groups],
  );
  const desktopOverviewNodes = useMemo(
    () =>
      model.groups
        .filter((group) => group.generation <= 2)
        .map((group) => ({ id: group.id })),
    [model.groups],
  );
  const mobileOverviewNodes = useMemo(
    () =>
      model.groups
        .filter((group) => group.generation === 1)
        .map((group) => ({ id: group.id })),
    [model.groups],
  );
  const collapsibleGroupIds = useMemo(
    () => new Set(model.links.map((link) => link.source)),
    [model.links],
  );
  const maxGeneration = Math.max(
    1,
    ...members.map((member) => member.generation),
  );
  const hidden = useMemo(() => {
    return collapsedDescendantGroups(model.links, collapsed);
  }, [collapsed, model]);
  const relatedIds = useMemo(() => {
    if (!selected) return null;
    const family = relatives(members, selected);
    return new Set([
      selected.id,
      ...family.parents.map((person) => person.id),
      ...family.spouses.map((person) => person.id),
      ...family.children.map((person) => person.id),
      ...family.siblings.map((person) => person.id),
    ]);
  }, [members, selected]);
  const select = useCallback(
    (p: Member) => {
      setCollapsed(new Set());
      setSelected(p);
      setQuery('');
      const g = model.groups.find((g) => g.id === model.groupOf.get(p.id));
      if (g) {
        const i = g.people.findIndex((m) => m.id === p.id);
        void flow.setCenter(
          g.x + i * (PERSON_WIDTH + PERSON_GAP) + PERSON_WIDTH / 2,
          g.y + PERSON_HEIGHT / 2,
          { zoom: 0.95, duration: 450 },
        );
      }
    },
    [flow, model],
  );
  useEffect(() => {
    if (!ready) return;
    const id = params.get('person');
    const p = members.find((m) => m.id === id);
    if (!p) return;
    const frame = requestAnimationFrame(() => select(p));
    return () => cancelAnimationFrame(frame);
  }, [members, params, ready, select]);
  useEffect(() => {
    if (!ready || !allTreeNodes.length) return;
    const frame = requestAnimationFrame(() => {
      void flow.fitView({
        nodes: window.matchMedia('(max-width: 720px)').matches
          ? mobileOverviewNodes
          : desktopOverviewNodes,
        padding: 0.16,
        maxZoom: 0.9,
        duration: 0,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    allTreeNodes.length,
    desktopOverviewNodes,
    flow,
    mobileOverviewNodes,
    ready,
  ]);
  useEffect(() => {
    const changed = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', changed);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const nodes: FamilyNode[] = model.groups.map((group) => ({
    id: group.id,
    type: 'household',
    position: { x: group.x, y: group.y },
    hidden: hidden.has(group.id),
    draggable: false,
    data: {
      group,
      selected: selected?.id || null,
      dimmed: group.people
        .filter(
          (p) =>
            (branch !== 'all' && p.branch !== Number(branch)) ||
            (generation !== 'all' && p.generation !== Number(generation)) ||
            (!!relatedIds && !relatedIds.has(p.id)),
        )
        .map((p) => p.id),
      collapsed: collapsed.has(group.id),
      hasChildren: model.links.some((l) => l.source === group.id),
      select,
      collapse: (id) =>
        setCollapsed((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    },
  }));
  const edges = model.links.flatMap((link) =>
    link.parentIds.map((parentId) => ({
      id: `${link.id}-${parentId}`,
      source: link.source,
      target: link.target,
      sourceHandle: `parent-${parentId}`,
      targetHandle: `child-${link.childId}`,
      type: 'smoothstep',
      hidden: hidden.has(link.source) || hidden.has(link.target),
      style: { stroke: '#aaa69a', strokeWidth: 1.15 },
      pathOptions: { borderRadius: 3 },
    })),
  );
  const found = searchMembers(members, query).slice(0, 6);
  function resetViewport() {
    return flow.fitView({
      nodes: window.matchMedia('(max-width: 720px)').matches
        ? mobileOverviewNodes
        : desktopOverviewNodes,
      padding: 0.16,
      maxZoom: 0.9,
      duration: 400,
    });
  }
  function reset() {
    setCollapsed(new Set());
    setBranch('all');
    setGeneration('all');
    setQuery('');
    setSelected(null);
    void resetViewport();
  }
  function collapseAll() {
    setCollapsed(new Set(collapsibleGroupIds));
  }
  return (
    <main
      id="main"
      className={`tree-page ${full ? 'is-fullscreen' : ''}`}
      ref={container}
    >
      <div className="tree-toolbar">
        <div className="tree-title">
          <GitFork size={22} />
          <div>
            <h1>Cây gia phả</h1>
            <small>Họ Nguyễn Bá · {members.length} thành viên</small>
          </div>
        </div>
        <div className="tree-search">
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Tìm trong gia phả…"
          />
          {query && (
            <div className="search-results">
              {found.length ? (
                found.map((p) => (
                  <button
                    className="relative-button"
                    onClick={() => select(p)}
                    key={p.id}
                  >
                    <Avatar person={p} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        Đời {p.generation} · {branchName(p.branch)}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p>Không tìm thấy thành viên.</p>
              )}
            </div>
          )}
        </div>
        <Choice
          label="Lọc chi"
          value={branch}
          onChange={setBranch}
          options={branchOptions}
        />
        <Choice
          label="Lọc đời"
          value={generation}
          onChange={setGeneration}
          options={generationOptions.filter(
            (o) => o.value === 'all' || Number(o.value) <= maxGeneration,
          )}
        />
        <Button
          className="icon-button"
          variant="ghost"
          title="Đặt lại chế độ xem"
          aria-label="Đặt lại chế độ xem"
          onClick={reset}
        >
          <RotateCcw />
        </Button>
      </div>
      <div className="tree-canvas">
        <div
          className="tree-legend"
          aria-label="Chú thích các chi trong gia phả"
        >
          <strong>Chú thích</strong>
          <div>
            <span>
              <i className="branch-dot b1" />
              Chi trưởng
            </span>
            <span>
              <i className="branch-dot b2" />
              Chi hai
            </span>
            <span>
              <i className="branch-dot b3" />
              Chi ba
            </span>
          </div>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={1.8}
          onInit={(instance) => {
            setReady(true);
            if (window.matchMedia('(max-width: 720px)').matches) {
              requestAnimationFrame(() => {
                void instance.fitView({
                  nodes: mobileOverviewNodes,
                  padding: 0.16,
                  maxZoom: 0.9,
                  duration: 0,
                });
              });
            }
          }}
          onMove={(_, v) => setZoom(v.zoom)}
        >
          <Background color="#dfe2d8" gap={28} size={1} />
        </ReactFlow>
        <div className="tree-controls">
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.zoomOut({ duration: 200 })}
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <Minus />
          </Button>
          <output>{Math.round(zoom * 100)}%</output>
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.zoomIn({ duration: 200 })}
            title="Phóng to"
            aria-label="Phóng to"
          >
            <Plus />
          </Button>
          <span />
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.fitView({ padding: 0.15, duration: 400 })}
            title="Vừa màn hình"
            aria-label="Vừa màn hình"
          >
            <Scan />
          </Button>
          <span />
          <Button
            variant="ghost"
            className="icon-button"
            onClick={collapseAll}
            disabled={
              !collapsibleGroupIds.size ||
              collapsed.size === collapsibleGroupIds.size
            }
            title="Thu gọn toàn bộ hậu duệ"
            aria-label="Thu gọn toàn bộ hậu duệ"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => setCollapsed(new Set())}
            disabled={!collapsed.size}
            title="Mở toàn bộ hậu duệ"
            aria-label="Mở toàn bộ hậu duệ"
          >
            <ChevronDown />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await document.documentElement.requestFullscreen();
              } catch {
                setFull(false);
              }
            }}
            title="Toàn màn hình"
            aria-label="Toàn màn hình"
          >
            {full ? <Minimize /> : <Maximize />}
          </Button>
        </div>
        {(branch !== 'all' || generation !== 'all') && (
          <div className="active-filter">
            Đang làm nổi bật{' '}
            {branch !== 'all' ? branchName(Number(branch)) : ''}{' '}
            {generation !== 'all' ? `· Đời ${generation}` : ''}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa bộ lọc"
              onClick={() => {
                setBranch('all');
                setGeneration('all');
              }}
            >
              <X />
            </Button>
          </div>
        )}
      </div>
      <QuickView
        person={selected}
        onClose={() => setSelected(null)}
        onSelect={select}
      />
    </main>
  );
}
