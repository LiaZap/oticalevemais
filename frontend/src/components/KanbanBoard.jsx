import React from 'react';
import { DndContext, closestCorners, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { Phone, MessageCircle } from 'lucide-react';

export function KanbanBoard({ atendimentos, onStatusChange, onCardClick }) {
  const [activeId, setActiveId] = React.useState(null);
  const [activeItem, setActiveItem] = React.useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const columns = [
    { id: 'Pendente', title: 'Pendente', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
    { id: 'Em Andamento', title: 'Em Andamento', color: 'bg-blue-100 dark:bg-blue-900/20' },
    { id: 'Agendado', title: 'Agendado', color: 'bg-green-100 dark:bg-green-900/20' },
    { id: 'Finalizado', title: 'Finalizado', color: 'bg-zinc-100 dark:bg-zinc-800' },
    { id: 'Cancelado', title: 'Cancelado', color: 'bg-red-100 dark:bg-red-900/20' },
  ];

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveItem(event.active.data.current?.item);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the item and the new status (column)
    // Note: over.id could be a column ID or another item ID
    const activeItem = atendimentos.find(item => item.id === activeId);
    
    let newStatus = overId;
    
    // If dropped over another card, find that card's status
    if (!columns.some(col => col.id === overId)) {
       const overItem = atendimentos.find(item => item.id === overId);
       if (overItem) {
         newStatus = overItem.status;
       }
    }

    if (activeItem && activeItem.status !== newStatus && columns.some(col => col.id === newStatus)) {
      onStatusChange(activeItem.id, newStatus);
    }

    setActiveId(null);
    setActiveItem(null);
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {columns.map(col => (
          <KanbanColumn 
            key={col.id} 
            id={col.id} 
            title={col.title} 
            count={atendimentos.filter(a => a.status === col.id).length}
          >
            {atendimentos
              .filter(item => item.status === col.id)
              .map(item => (
                <KanbanCard key={item.id} item={item} onClick={() => onCardClick && onCardClick(item)} />
              ))}
          </KanbanColumn>
        ))}
      </div>
      
      <DragOverlay>
        {activeItem ? <KanbanCard item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export function KanbanColumn({ id, title, count, children }) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col min-w-[300px] w-[300px] bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">{title}</h3>
        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-xs font-medium">
          {count}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 flex flex-col gap-3 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

export function KanbanCard({ item, onClick }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      onClick={onClick}
      className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 cursor-move hover:shadow-md transition-shadow touch-none relative group"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-zinc-900 dark:text-white line-clamp-1">{item.cliente}</h4>
        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">
           {new Date(item.data_inicio).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
        </span>
      </div>
      
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Phone size={12} />
          <span>{item.telefone}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <MessageCircle size={12} />
          <span>{item.canal}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
        <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded">
            {item.tipo}
        </span>
      </div>
    </div>
  );
}



