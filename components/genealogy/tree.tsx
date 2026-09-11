'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BaseEdge,
  Background,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  branchName,
  memberName,
  memberYearRange,
  searchMembers,
  type Member,
} from '@/lib/family';
import {
  collapsedDescendantGroups,
  layoutFamily,
  type Household,
} from '@/lib/tree-layout';
import { Avatar } from './home';
import { HeritageIcon } from './heritage-icon';
import { QuickView } from './members';
import { Choice, branchOptions, generationOptions, SearchBox } from './common';
import { useFamily } from './provider';

type FamilyUnitData = {
  group: Household;
  selected: string | null;
  dimmed: string[];
  collapsed: boolean;
  hasChildren: boolean;
  select: (person: Member) => void;
  collapse: (id: string) => void;
};

type FamilyUnitNode = Node<FamilyUnitData, 'family-unit' | 'root-family'>;
type GenerationBandNode = Node<{ generation: number }, 'generation-band'>;

function FamilyBranchEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  ...edge
}: EdgeProps) {
  const busY = sourceY + Math.max(32, Math.min(58, (targetY - sourceY) * 0.38));
  const path = `M ${sourceX},${sourceY} L ${sourceX},${busY} L ${targetX},${busY} L ${targetX},${targetY}`;

  return <BaseEdge path={path} {...edge} />;
}

function PersonArea({
  person,
  role,
  selected,
  dimmed,
  onSelect,
}: {
  person: Member;
  role: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: (person: Member) => void;
}) {
  return (
    <button
      className={`family-member-area nodrag nopan ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(person);
      }}
      aria-label={`${memberName(person)}, ${role}, đời ${person.generation}`}
    >
      <Avatar person={person} />
      <span className="family-member-copy">
        <span className="family-member-role">{role}</span>
        <strong>{memberName(person)}</strong>
        <span className="family-member-years">
          {memberYearRange(person)}
        </span>
      </span>
    </button>
  );
}

function FamilyUnitNodeCard({ data }: Pick<NodeProps<FamilyUnitNode>, 'data'>) {
  const { group } = data;
  const terminal = group.kind === 'terminal';
  const root = group.root;

  return (
    <article
      className={`family-unit ${root ? 'root-family-unit' : ''} ${terminal ? 'terminal-family-unit' : ''} ${group.lineageType === 'maternal-terminal' ? 'maternal-family-unit' : ''}`}
      style={{ width: group.width, minHeight: group.height }}
    >
      {!root && <Handle type="target" position={Position.Top} id="family-in" />}
      <div className="family-unit-heading">
        <span className="family-generation-label">
          {root
            ? 'KHỞI NGUỒN DÒNG HỌ'
            : terminal
              ? 'NHÁNH NGOẠI'
              : `ĐỜI THỨ ${group.generation}`}
        </span>
        {!terminal && !root && (
          <small className="family-branch-label">{branchName(group.clanMember.branch)}</small>
        )}
      </div>
      <PersonArea
        person={group.clanMember}
        role={terminal ? 'Con trực tiếp' : 'Thành viên dòng họ'}
        selected={data.selected === group.clanMember.id}
        dimmed={data.dimmed.includes(group.clanMember.id)}
        onSelect={data.select}
      />
      {group.spouses.length > 0 && (
        <div className="family-spouse-list">
          {group.spouses.map((spouse, index) => (
            <div className="family-spouse-entry" key={spouse.id}>
              {index === 0 && <span className="family-unit-divider" />}
              <PersonArea
                person={spouse}
                role={spouse.gender === 'female' ? 'Vợ · phối ngẫu' : 'Chồng · phối ngẫu'}
                selected={data.selected === spouse.id}
                dimmed={data.dimmed.includes(spouse.id)}
                onSelect={data.select}
              />
            </div>
          ))}
        </div>
      )}
      {group.lineageType === 'maternal-terminal' &&
        !terminal &&
        group.spouses.length === 0 && (
          <div className="family-spouse-missing">Chưa ghi nhận con rể</div>
        )}
      {group.lineageType === 'maternal-terminal' && !terminal && (
        <span className="maternal-branch-badge">Nhánh ngoại</span>
      )}
      {data.hasChildren && (
        <>
          <Handle type="source" position={Position.Bottom} id="family-out" />
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
            <img
              className="collapse-node-icon"
              src={
                data.collapsed
                  ? '/app-icons/tree-expand.png'
                  : '/app-icons/tree-collapse.png'
              }
              alt=""
            />
          </Button>
        </>
      )}
    </article>
  );
}

function RootFamilyNode({ data }: NodeProps<FamilyUnitNode>) {
  return <FamilyUnitNodeCard data={data} />;
}

function GenerationBand({ data }: NodeProps<GenerationBandNode>) {
  return <div className="generation-band">ĐỜI THỨ {data.generation}</div>;
}

const nodeTypes = {
  'family-unit': FamilyUnitNodeCard,
  'root-family': RootFamilyNode,
  'generation-band': GenerationBand,
};

const edgeTypes = {
  'family-branch': FamilyBranchEdge,
};

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
  const initialTreeLayout = useRef(false);
  const flow = useReactFlow();
  const model = useMemo(
    () => layoutFamily(members, collapsed),
    [collapsed, members],
  );
  const treeMembers = useMemo(
    () => members.filter((member) => model.visibleMemberIds.has(member.id)),
    [members, model.visibleMemberIds],
  );
  const allTreeNodes = useMemo(
    () => model.groups.map((group) => ({ id: group.id })),
    [model.groups],
  );
  const collapsibleGroupIds = useMemo(
    () => new Set(model.links.map((link) => link.source)),
    [model.links],
  );
  const maxGeneration = Math.max(
    1,
    ...treeMembers.map((member) => member.generation),
  );
  const hidden = useMemo(
    () => collapsedDescendantGroups(model.links, collapsed),
    [collapsed, model.links],
  );

  const focusPerson = useCallback(
    (person: Member) => {
      setCollapsed(new Set());
      setSelected(person);
      setQuery('');
      const group = model.groups.find(
        (candidate) => candidate.id === model.groupOf.get(person.id),
      );
      if (!group) return;
      void flow.setCenter(group.x + group.width / 2, group.y + group.height / 2, {
        zoom: group.root ? 0.82 : 0.98,
        duration: 450,
      });
    },
    [flow, model],
  );

  useEffect(() => {
    if (!ready) return;
    const id = params.get('person');
    const person = members.find((member) => member.id === id);
    if (!person || !model.visibleMemberIds.has(person.id)) return;
    const frame = requestAnimationFrame(() => focusPerson(person));
    return () => cancelAnimationFrame(frame);
  }, [focusPerson, members, model.visibleMemberIds, params, ready]);

  useEffect(() => {
    if (!ready || initialTreeLayout.current) return;
    initialTreeLayout.current = true;
    const frame = requestAnimationFrame(() => {
      void flow.fitView({
        nodes: allTreeNodes,
        padding: window.matchMedia('(max-width: 720px)').matches ? 0.12 : 0.18,
        maxZoom: window.matchMedia('(max-width: 720px)').matches ? 0.78 : 0.92,
        duration: 0,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    allTreeNodes,
    flow,
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

  const familyNodes: FamilyUnitNode[] = model.groups.map((group) => ({
    id: group.id,
    type: group.root ? 'root-family' : 'family-unit',
    position: { x: group.x, y: group.y },
    hidden: hidden.has(group.id),
    draggable: false,
    data: {
      group,
      selected: selected?.id || null,
      dimmed: group.people
        .filter(
          (person) =>
            (branch !== 'all' && person.branch !== Number(branch)) ||
            (generation !== 'all' && person.generation !== Number(generation)),
        )
        .map((person) => person.id),
      collapsed: collapsed.has(group.id),
      hasChildren: model.links.some((link) => link.source === group.id),
      select: focusPerson,
      collapse: (id) =>
        setCollapsed((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    },
  }));
  const leftEdge = Math.min(...model.groups.map((group) => group.x), 0);
  const generationNodes: GenerationBandNode[] = model.generationLanes.map(
    (lane) => ({
      id: `generation-${lane.generation}`,
      type: 'generation-band',
      position: { x: leftEdge - 146, y: lane.y + 14 },
      draggable: false,
      selectable: false,
      hidden: model.groups
        .filter((group) => group.generation === lane.generation)
        .every((group) => hidden.has(group.id)),
      data: { generation: lane.generation },
    }),
  );
  const edges = model.links.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
    sourceHandle: 'family-out',
    targetHandle: 'family-in',
    type: 'family-branch',
    hidden: hidden.has(link.source) || hidden.has(link.target),
    className:
      link.branchType === 'maternal-terminal' ? 'maternal-tree-edge' : '',
    style: {
      stroke: link.branchType === 'maternal-terminal' ? '#a47b51' : '#958d7d',
      strokeDasharray:
        link.branchType === 'maternal-terminal' ? '5 5' : undefined,
      strokeWidth: link.branchType === 'maternal-terminal' ? 1.45 : 1.35,
    },
  }));
  const found = searchMembers(treeMembers, query).slice(0, 6);

  function resetViewport() {
    return flow.fitView({
      nodes: allTreeNodes,
      padding: window.matchMedia('(max-width: 720px)').matches ? 0.12 : 0.18,
      maxZoom: window.matchMedia('(max-width: 720px)').matches ? 0.78 : 0.92,
      duration: 400,
    });
  }

  function reset() {
    setCollapsed(new Set());
    setBranch('all');
    setGeneration('all');
    setQuery('');
    setSelected(null);
    requestAnimationFrame(() => void resetViewport());
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
          <HeritageIcon name="tree" size={22} />
          <div>
            <h1>Cây gia phả</h1>
            <small>Họ Nguyễn Bá · {treeMembers.length} người được ghi nhận</small>
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
                found.map((person) => (
                  <button
                    className="relative-button"
                    onClick={() => focusPerson(person)}
                    key={person.id}
                  >
                    <Avatar person={person} />
                    <span>
                      <strong>{memberName(person)}</strong>
                      <small>
                        Đời {person.generation} · {branchName(person.branch)}
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
            (option) =>
              option.value === 'all' || Number(option.value) <= maxGeneration,
          )}
        />
        <Button
          className="icon-button"
          variant="ghost"
          title="Đặt lại chế độ xem"
          aria-label="Đặt lại chế độ xem"
          onClick={reset}
        >
          <HeritageIcon name="reset" size={19} />
        </Button>
      </div>
      <div className="tree-canvas">
        <div className="tree-legend" aria-label="Cách đọc cây gia phả">
          <strong>Cách đọc cây</strong>
          <div>
            <span>
              <i className="tree-legend-line" /> Thành viên dòng họ ở trên
            </span>
            <span>
              <i className="tree-legend-line is-dashed" /> Nhánh ngoại được nối tiếp khi có hậu duệ
            </span>
          </div>
        </div>
        <ReactFlow
          nodes={[...familyNodes, ...generationNodes]}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          minZoom={0.2}
          maxZoom={1.8}
          onInit={(instance) => {
            setReady(true);
          }}
          onMove={(_, viewport) => setZoom(viewport.zoom)}
        >
          <Background color="#d8d1c3" gap={28} size={1} />
        </ReactFlow>
        <div className="tree-controls">
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.zoomOut({ duration: 200 })}
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <HeritageIcon name="zoom-out" size={19} />
          </Button>
          <output>{Math.round(zoom * 100)}%</output>
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.zoomIn({ duration: 200 })}
            title="Phóng to"
            aria-label="Phóng to"
          >
            <HeritageIcon name="zoom-in" size={19} />
          </Button>
          <span />
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => flow.fitView({ padding: 0.15, duration: 400 })}
            title="Vừa màn hình"
            aria-label="Vừa màn hình"
          >
            <HeritageIcon name="fit-view" size={19} />
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
            <ChevronUp size={19} />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            onClick={() => setCollapsed(new Set())}
            disabled={!collapsed.size}
            title="Mở toàn bộ hậu duệ"
            aria-label="Mở toàn bộ hậu duệ"
          >
            <ChevronDown size={19} />
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
            <img
              className="tree-fullscreen-icon"
              src="/app-icons/tree-fullscreen.png"
              alt=""
            />
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
              <HeritageIcon name="close" size={18} />
            </Button>
          </div>
        )}
      </div>
      <QuickView
        person={selected}
        onClose={() => setSelected(null)}
        onSelect={focusPerson}
      />
    </main>
  );
}
