'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  useReactFlow,
  MiniMap,
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
import { branchName, searchMembers, type Member } from '@/lib/family';
import {
  layoutFamily,
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
            className={`tree-person nodrag branch-${p.branch} ${data.selected === p.id ? 'chosen' : ''} ${data.dimmed.includes(p.id) ? 'dimmed' : ''}`}
            onClick={() => data.select(p)}
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
          className="collapse-node nodrag"
          title={data.collapsed ? 'Mở hậu duệ' : 'Thu gọn hậu duệ'}
          aria-label={data.collapsed ? 'Mở hậu duệ' : 'Thu gọn hậu duệ'}
          onClick={() => data.collapse(group.id)}
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
  const hidden = useMemo(() => {
    const ids = new Set<string>();
    const stack = [...collapsed];
    while (stack.length) {
      const parent = stack.pop()!;
      model.links
        .filter((l) => l.source === parent)
        .forEach((l) => {
          if (!ids.has(l.target)) {
            ids.add(l.target);
            stack.push(l.target);
          }
        });
    }
    return ids;
  }, [collapsed, model]);
  function select(p: Member) {
    setCollapsed(new Set());
    setSelected(p);
    setQuery('');
    const g = model.groups.find((g) => g.id === model.groupOf.get(p.id));
    if (g) {
      const i = g.people.findIndex((m) => m.id === p.id);
      void flow.setCenter(
        g.x + i * (PERSON_WIDTH + PERSON_GAP) + PERSON_WIDTH / 2,
        g.y + 75,
        { zoom: 0.95, duration: 450 },
      );
    }
  }
  useEffect(() => {
    if (!ready) return;
    const id = params.get('person');
    const p = members.find((m) => m.id === id);
    if (p) select(p);
  }, [ready, params]);
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
            (generation !== 'all' && p.generation !== Number(generation)),
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
      style: { stroke: '#a49d8d', strokeWidth: 1.3 },
      pathOptions: { borderRadius: 3 },
    })),
  );
  const found = searchMembers(members, query).slice(0, 6);
  function reset() {
    setCollapsed(new Set());
    setBranch('all');
    setGeneration('all');
    setQuery('');
    setSelected(null);
    void flow.fitView({
      nodes: model.groups
        .filter((g) => g.generation <= 2)
        .map((g) => ({ id: g.id })),
      padding: 0.2,
      maxZoom: 1,
      duration: 400,
    });
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
            (o) =>
              o.value === 'all' ||
              Number(o.value) <= Math.max(...members.map((m) => m.generation)),
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
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          minZoom={0.3}
          maxZoom={2}
          fitView
          fitViewOptions={{
            nodes: model.groups
              .filter((g) => g.generation <= 2)
              .map((g) => ({ id: g.id })),
            padding: 0.2,
            maxZoom: 1,
          }}
          onInit={() => setReady(true)}
          onMove={(_, v) => setZoom(v.zoom)}
        >
          <Background color="#d6d8ce" gap={24} size={1} />
          <MiniMap
            nodeColor="#c3b59a"
            maskColor="#fafaf8b0"
            pannable
            zoomable
            className="family-minimap"
          />
        </ReactFlow>
        <div className="tree-legend">
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
          <small>Dữ liệu mẫu</small>
        </div>
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
