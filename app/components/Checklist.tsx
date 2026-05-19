import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskItem {
  id: string;
  text: string;
  checked: boolean;
}

export function parseChecklist(text: string): TaskItem[] {
  if (!text) return [{ id: Math.random().toString(36).slice(2), text: '', checked: false }];
  const lines = text.split('\n');
  return lines.map(line => {
    let checked = false;
    let content = line;
    
    if (content.startsWith('- [x] ') || content.startsWith('- [X] ')) {
      checked = true;
      content = content.slice(6);
    } else if (content.startsWith('- [ ] ')) {
      checked = false;
      content = content.slice(6);
    } else if (content.startsWith('- ')) {
      checked = false;
      content = content.slice(2);
    }
    
    return {
      id: Math.random().toString(36).slice(2),
      text: content,
      checked
    };
  });
}

export function serializeChecklist(items: TaskItem[]): string {
  const meaningfulItems = items.filter(item => item.text.trim());

  if (meaningfulItems.length === 0) {
    return '';
  }

  return meaningfulItems.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
}

export function hasChecklistItems(text: string | null | undefined): boolean {
  return parseChecklist(text ?? '').some(item => item.text.trim() !== '');
}

interface ChecklistEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChecklistEditor({ value, onChange, onSave, placeholder, className }: ChecklistEditorProps) {
  const [items, setItems] = useState<TaskItem[]>(() => parseChecklist(value));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const isComposing = useRef(false);
  const lastNotifiedValue = useRef<string>(value);
  const latestSerializedValue = useRef<string>(serializeChecklist(parseChecklist(value)));

  // Sync state if external value changes completely (e.g. user switch)
  useEffect(() => {
    const incomingSerialized = serializeChecklist(parseChecklist(value));
    if (incomingSerialized !== lastNotifiedValue.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(parseChecklist(value));
      lastNotifiedValue.current = incomingSerialized;
      latestSerializedValue.current = incomingSerialized;
    }
  }, [value]);

  const updateItems = useCallback((newItems: TaskItem[]) => {
    setItems(newItems);
    const serialized = serializeChecklist(newItems);
    lastNotifiedValue.current = serialized;
    latestSerializedValue.current = serialized;
    onChange(serialized);
  }, [onChange]);

  const handleItemChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index].text = text;
    updateItems(newItems);
  };

  const handleItemToggle = (index: number) => {
    const newItems = [...items];
    newItems[index].checked = !newItems[index].checked;
    updateItems(newItems);
    // Auto-save on toggle
    onSave(serializeChecklist(newItems));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing.current) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const newItems = [...items];
      newItems.splice(index + 1, 0, { id: Math.random().toString(36).slice(2), text: '', checked: false });
      updateItems(newItems);
      onSave(serializeChecklist(newItems));
      setTimeout(() => inputsRef.current[index + 1]?.focus(), 0);
    } else if (e.key === 'Backspace' && items[index].text === '') {
      e.preventDefault();
      if (items.length > 1) {
        const newItems = [...items];
        newItems.splice(index, 1);
        updateItems(newItems);
        onSave(serializeChecklist(newItems));
        setTimeout(() => {
          const prevIndex = index > 0 ? index - 1 : 0;
          inputsRef.current[prevIndex]?.focus();
          // Move cursor to end of previous input
          const input = inputsRef.current[prevIndex];
          if (input) {
            input.selectionStart = input.selectionEnd = input.value.length;
          }
        }, 0);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < items.length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isComposing.current) return;
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return;
    onSave(latestSerializedValue.current);
  };

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-1.5", className)}>
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-2 group">
          <button
            type="button"
            onClick={() => handleItemToggle(index)}
            className="mt-[3px] shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
          >
            {item.checked ? (
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Square className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
          <input
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            className={cn(
              "flex-1 bg-transparent px-0 py-0 text-xs leading-[1.35rem] outline-none placeholder:text-muted-foreground/60 min-w-0",
              item.checked && "text-muted-foreground line-through decoration-muted-foreground/50"
            )}
            placeholder={index === 0 ? placeholder : ''}
            value={item.text}
            onChange={(e) => handleItemChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onBlur={handleBlur}
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={() => { isComposing.current = false; }}
          />
        </div>
      ))}
    </div>
  );
}

interface ChecklistViewerProps {
  value: string;
  className?: string;
  emptyText?: string;
}

export function ChecklistViewer({ value, className, emptyText }: ChecklistViewerProps) {
  const items = parseChecklist(value);
  const validItems = items.filter(item => item.text.trim() !== '');

  if (validItems.length === 0) {
    return (
      <div className={className}>
        <p className="whitespace-pre-wrap text-xs leading-[1.35rem] text-muted-foreground italic">
          {emptyText || 'No tasks logged yet'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {validItems.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="mt-[3px] shrink-0 text-muted-foreground">
            {item.checked ? (
              <CheckSquare className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <Square className="w-3.5 h-3.5 opacity-40" />
            )}
          </div>
          <span
            className={cn(
              "flex-1 text-xs leading-[1.35rem] break-words min-w-0",
              item.checked ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground/90"
            )}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}
