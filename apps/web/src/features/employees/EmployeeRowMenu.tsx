import { useEffect, useId, useRef, useState } from 'react';
import type { Employee } from '../../api/types';
import { useI18n } from '../../i18n/locale-context';

export function EmployeeRowMenu({
  employee,
  open,
  onOpen,
  onClose,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState({
    top: 0,
    right: 0,
    above: false,
  });

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-ink"
        aria-label={t('employees.actionsFor', { id: employee.employeeId })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          if (open) {
            onClose();
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const above = window.innerHeight - rect.bottom < 96;
          setAnchor({
            top: above ? rect.top - 4 : rect.bottom + 4,
            right: Math.max(8, window.innerWidth - rect.right),
            above,
          });
          onOpen();
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-4 w-4 fill-current"
        >
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="fixed z-30 grid min-w-36 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg"
          style={{
            top: anchor.top,
            right: anchor.right,
            transform: anchor.above ? 'translateY(-100%)' : undefined,
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="cursor-pointer px-3 py-2 text-left text-ink hover:bg-canvas"
            onClick={() => {
              onClose();
              onEdit();
            }}
          >
            {t('employees.edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="cursor-pointer px-3 py-2 text-left text-danger hover:bg-canvas"
            onClick={() => {
              onClose();
              onDelete();
            }}
          >
            {t('employees.delete')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
