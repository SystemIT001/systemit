import React from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanItem {
  id: string;
  [key: string]: any;
}

interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onMoveItem: (itemId: string, newColumnId: string) => void;
  renderCard: (item: KanbanItem) => React.ReactNode;
}

const SortableItem = ({ item, renderCard }: { item: KanbanItem, renderCard: (item: KanbanItem) => React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    marginBottom: '0.5rem',
    touchAction: 'none' // Crucial para móviles
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(item)}
    </div>
  );
};

const Column = ({ column, renderCard }: { column: KanbanColumn, renderCard: (item: KanbanItem) => React.ReactNode }) => {
  return (
    <div style={{
      flex: '1 1 300px',
      minWidth: '280px',
      backgroundColor: 'var(--surface-hover)',
      padding: '1rem',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-main)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem' }}>
        {column.title} <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>({column.items.length})</span>
      </h3>
      <SortableContext items={column.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, minHeight: '150px' }}>
          {column.items.map(item => (
            <SortableItem key={item.id} item={item} renderCard={renderCard} />
          ))}
          {column.items.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
              Arrastra aquí
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, onMoveItem, renderCard }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar a qué columna pertenece el active y el over
    let sourceColId = '';
    let destColId = '';

    columns.forEach(col => {
      if (col.items.find(i => i.id === activeId)) sourceColId = col.id;
      if (col.id === overId || col.items.find(i => i.id === overId)) destColId = col.id;
    });

    if (sourceColId && destColId && sourceColId !== destColId) {
      onMoveItem(activeId, destColId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start' }}>
        {columns.map(col => (
          <Column key={col.id} column={col} renderCard={renderCard} />
        ))}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;
