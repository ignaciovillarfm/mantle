"use client";

import {
  hoverRevealOnGroupClassName,
  hoverRevealRemoveClassName,
  removeIconMarkClassName,
} from "@/lib/hoverRevealRemove";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { dedupeMemberIds, type SacramentRoleKey } from "@/lib/sacrament/sacramentRoles";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { clearRolePoolReorderLock, tryConsumeRolePoolReorder } from "./rolePoolDragDrop";

export type RolePoolDragItemData = {
  type: "role-pool-member";
  role: SacramentRoleKey;
  memberId: string;
};

function isRolePoolDragItem(data: Record<string, unknown>): data is RolePoolDragItemData {
  return data.type === "role-pool-member" && typeof data.role === "string" && typeof data.memberId === "string";
}

function reorderIndexFromHit({
  startIndex,
  indexOfTarget,
  clientY,
  rowElements,
  memberIds,
}: {
  startIndex: number;
  indexOfTarget: number;
  clientY: number;
  rowElements: Map<string, HTMLElement>;
  memberIds: string[];
}): number {
  const targetId = memberIds[indexOfTarget];
  const el = targetId ? rowElements.get(targetId) : null;
  if (!el) return startIndex;
  const rect = el.getBoundingClientRect();
  const mid = rect.top + rect.height / 2;
  const edge = clientY < mid ? ("top" as const) : ("bottom" as const);
  return getReorderDestinationIndex({
    startIndex,
    indexOfTarget,
    closestEdgeOfTarget: edge,
    axis: "vertical",
  });
}

/** Drop index from pointer Y; snaps inside the list container even between rows. */
function destinationIndexFromPointer(
  clientY: number,
  memberIds: string[],
  rowElements: Map<string, HTMLElement>,
  sourceMemberId: string,
  listEl: HTMLElement | null,
): number {
  const startIndex = memberIds.indexOf(sourceMemberId);
  if (startIndex === -1) return -1;

  for (let i = 0; i < memberIds.length; i++) {
    const el = rowElements.get(memberIds[i]);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) continue;

    if (memberIds[i] === sourceMemberId) return startIndex;

    return reorderIndexFromHit({
      startIndex,
      indexOfTarget: i,
      clientY,
      rowElements,
      memberIds,
    });
  }

  for (let i = 0; i < memberIds.length - 1; i++) {
    const cur = rowElements.get(memberIds[i])?.getBoundingClientRect();
    const next = rowElements.get(memberIds[i + 1])?.getBoundingClientRect();
    if (!cur || !next) continue;
    if (clientY > cur.bottom && clientY < next.top) {
      return getReorderDestinationIndex({
        startIndex,
        indexOfTarget: i + 1,
        closestEdgeOfTarget: "top",
        axis: "vertical",
      });
    }
  }

  const first = rowElements.get(memberIds[0])?.getBoundingClientRect();
  const last = rowElements.get(memberIds[memberIds.length - 1])?.getBoundingClientRect();
  if (first && clientY < first.top) {
    return getReorderDestinationIndex({
      startIndex,
      indexOfTarget: 0,
      closestEdgeOfTarget: "top",
      axis: "vertical",
    });
  }
  if (last && clientY > last.bottom) {
    return memberIds.length;
  }

  if (!listEl) return startIndex;

  const listRect = listEl.getBoundingClientRect();
  if (clientY < listRect.top || clientY > listRect.bottom) return startIndex;

  if (memberIds.length <= 1) return startIndex;

  let nearestIndex = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < memberIds.length; i++) {
    const el = rowElements.get(memberIds[i]);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - mid);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIndex = i;
    }
  }

  return reorderIndexFromHit({
    startIndex,
    indexOfTarget: nearestIndex,
    clientY,
    rowElements,
    memberIds,
  });
}

function memberIdsFromListDom(listEl: HTMLElement | null): string[] {
  if (!listEl) return [];
  return Array.from(listEl.querySelectorAll<HTMLElement>("[data-pool-row]"))
    .map((el) => el.dataset.poolRow)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

function RolePoolMemberRow({
  role,
  memberId,
  name,
  removeLabel,
  isDragging,
  registerRow,
  onRemove,
}: {
  role: SacramentRoleKey;
  memberId: string;
  name: string;
  removeLabel: string;
  isDragging: boolean;
  registerRow: (memberId: string, el: HTMLLIElement | null) => void;
  onRemove: () => void;
}) {
  const rowRef = useRef<HTMLLIElement | null>(null);

  const setRef = useCallback(
    (el: HTMLLIElement | null) => {
      rowRef.current = el;
      registerRow(memberId, el);
    },
    [memberId, registerRow],
  );

  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    return draggable({
      element: el,
      getInitialData: (): RolePoolDragItemData => ({
        type: "role-pool-member",
        role,
        memberId,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: preserveOffsetOnSource({
            element: el,
            input: location.current.input,
          }),
          render: ({ container }) => {
            const clone = el.cloneNode(true) as HTMLElement;
            clone.style.width = `${el.offsetWidth}px`;
            clone.style.boxShadow = "0 6px 16px rgba(0,0,0,0.14)";
            clone.style.borderRadius = "0.5rem";
            clone.style.background = "var(--background, #fff)";
            clone.querySelector("[data-remove-btn]")?.remove();
            container.appendChild(clone);
          },
        });
      },
    });
  }, [role, memberId]);

  return (
    <li
      ref={setRef}
      data-pool-row={memberId}
      className={`group relative flex h-10 cursor-grab touch-none items-center gap-0 rounded-lg border border-border/80 bg-background px-2 text-sm transition-[opacity,box-shadow,gap] group-hover:gap-1.5 group-focus-within:gap-1.5 active:cursor-grabbing ${
        isDragging ? "pointer-events-none opacity-0" : "shadow-sm"
      }`}
    >
      <span
        className={cn(
          "flex w-0 shrink-0 items-center justify-center overflow-hidden text-foreground/45 transition-[width,opacity]",
          hoverRevealOnGroupClassName,
          "group-hover:w-4 group-focus-within:w-4",
        )}
        aria-hidden
      >
        <GripVertical className="size-4 shrink-0" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate py-2 pr-1">{name}</span>
      <button
        type="button"
        data-remove-btn
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
        className={`absolute top-1/2 left-full z-20 ml-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background text-lg leading-none text-foreground/50 shadow-sm hover:border-red-300 hover:bg-red-500/10 hover:text-red-600 ${
          isDragging ? "pointer-events-none opacity-0" : hoverRevealRemoveClassName
        }`}
      >
        <span className={removeIconMarkClassName} aria-hidden>
          ×
        </span>
      </button>
    </li>
  );
}

export function RolePoolDraggableList({
  role,
  memberIds,
  memberNameById,
  emptyLabel,
  removeLabel,
  onRemove,
  onReorder,
}: {
  role: SacramentRoleKey;
  memberIds: string[];
  memberNameById: Map<string, string>;
  emptyLabel: string;
  removeLabel: string;
  onRemove: (memberId: string) => void;
  onReorder: (startIndex: number, finishIndex: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rowElementsRef = useRef(new Map<string, HTMLElement>());
  const uniqueMemberIds = useMemo(() => dedupeMemberIds(memberIds), [memberIds]);
  const memberIdsRef = useRef(uniqueMemberIds);
  memberIdsRef.current = uniqueMemberIds;

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const [draggingMemberId, setDraggingMemberId] = useState<string | null>(null);

  const ownsDragSource = useCallback(
    (source: { element: HTMLElement }) => listRef.current?.contains(source.element) ?? false,
    [],
  );

  const registerRow = useCallback((memberId: string, el: HTMLLIElement | null) => {
    if (el) rowElementsRef.current.set(memberId, el);
    else rowElementsRef.current.delete(memberId);
  }, []);

  const commitReorderFromPointer = useCallback(
    (source: RolePoolDragItemData, clientY: number, clientX: number) => {
      const containerEl = containerRef.current;
      const listEl = listRef.current;
      if (!containerEl || !listEl) return;

      const containerRect = containerEl.getBoundingClientRect();
      const insideContainer =
        clientX >= containerRect.left &&
        clientX <= containerRect.right &&
        clientY >= containerRect.top &&
        clientY <= containerRect.bottom;
      if (!insideContainer) return;

      const canonicalIds = memberIdsRef.current;
      const startIndex = canonicalIds.indexOf(source.memberId);
      if (startIndex === -1) return;

      const domIds = memberIdsFromListDom(listEl);
      const idsForPointer = domIds.length > 0 ? domIds : canonicalIds;
      const destinationIndex = destinationIndexFromPointer(
        clientY,
        idsForPointer,
        rowElementsRef.current,
        source.memberId,
        listEl,
      );

      if (destinationIndex < 0 || destinationIndex === startIndex) return;

      const reorderKey = `${role}:${source.memberId}:${startIndex}:${destinationIndex}`;
      if (!tryConsumeRolePoolReorder(reorderKey)) return;

      onReorderRef.current(startIndex, destinationIndex);
    },
    [role],
  );

  const handleDragEvent = useCallback(
    (source: { data: Record<string, unknown>; element: HTMLElement }, clientY: number, clientX: number) => {
      if (!isRolePoolDragItem(source.data) || source.data.role !== role) return;
      if (!ownsDragSource(source)) return;
      commitReorderFromPointer(source.data, clientY, clientX);
    },
    [role, ownsDragSource, commitReorderFromPointer],
  );

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    return dropTargetForElements({
      element: containerEl,
      canDrop: ({ source }) => {
        const data = source.data;
        return isRolePoolDragItem(data) && data.role === role && ownsDragSource(source);
      },
      getData: () => ({ type: "role-pool-list", role }),
      onDrag: ({ source, location }) => {
        handleDragEvent(source, location.current.input.clientY, location.current.input.clientX);
      },
    });
  }, [role, handleDragEvent, ownsDragSource]);

  useEffect(() => {
    return monitorForElements({
      onDragStart({ source, location }) {
        if (!isRolePoolDragItem(source.data) || source.data.role !== role) return;
        if (!ownsDragSource(source)) return;
        clearRolePoolReorderLock();
        setDraggingMemberId(source.data.memberId);
        handleDragEvent(source, location.current.input.clientY, location.current.input.clientX);
      },
      onDrag({ source, location }) {
        handleDragEvent(source, location.current.input.clientY, location.current.input.clientX);
      },
      onDrop({ source }) {
        if (!isRolePoolDragItem(source.data) || source.data.role !== role) return;
        if (!ownsDragSource(source)) return;
        setDraggingMemberId(null);
        clearRolePoolReorderLock();
      },
    });
  }, [role, handleDragEvent, ownsDragSource]);

  if (uniqueMemberIds.length === 0) {
    return <p className="text-sm text-foreground/45">{emptyLabel}</p>;
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-10 flex-1 overflow-visible rounded-lg py-1 pr-9"
    >
      <ul ref={listRef} className="relative flex flex-col gap-1.5">
        {uniqueMemberIds.map((memberId) => (
          <RolePoolMemberRow
            key={memberId}
            role={role}
            memberId={memberId}
            name={memberNameById.get(memberId) ?? memberId}
            removeLabel={removeLabel}
            isDragging={draggingMemberId === memberId}
            registerRow={registerRow}
            onRemove={() => onRemove(memberId)}
          />
        ))}
      </ul>
    </div>
  );
}
