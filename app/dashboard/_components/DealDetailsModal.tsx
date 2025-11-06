'use client';

import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';

type DealDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  deal: any;
onSave: (updated: { id: string; deal_data: any }) => Promise<void>
};

type JsonVal = string | number | boolean | null | Record<string, any> | any[];

export default function DealDetailsModal({
  open,
  onClose,
  deal,
  onSave,
}: DealDetailsModalProps) {
  const [formData, setFormData] = useState<Record<string, JsonVal>>({});
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (deal?.deal_data) {
      // clone to avoid mutating parent
      setFormData(structuredClone(deal.deal_data));
      setJsonErrors({});
    }
  }, [deal]);

  if (!deal) return null;

  const handlePrimitiveChange = (key: string, raw: string) => {
    // Try to keep numbers as numbers, booleans as booleans (optional)
    let value: JsonVal = raw;
    if (raw === 'true' || raw === 'false') {
      value = raw === 'true';
    } else if (raw.trim() !== '' && !isNaN(Number(raw))) {
      value = Number(raw);
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleJsonChange = (key: string, raw: string) => {
    setJsonErrors((e) => ({ ...e, [key]: '' }));
    try {
      const parsed = JSON.parse(raw);
      setFormData((prev) => ({ ...prev, [key]: parsed }));
    } catch (err: any) {
      setJsonErrors((e) => ({ ...e, [key]: 'Invalid JSON' }));
    }
  };

const handleSave = async () => {
  const hasError = Object.values(jsonErrors).some(Boolean);
  if (hasError) return;

  await onSave({ id: deal.id, deal_data: formData }); // await here is safe now
  onClose();
};

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Edit Deal Details
          </Dialog.Title>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {Object.entries(formData).map(([key, value]) => {
              const isObject =
                typeof value === 'object' && value !== null && !Array.isArray(value);
              const isArray = Array.isArray(value);

              // For objects/arrays, show a textarea with JSON
              if (isObject || isArray) {
                const display = JSON.stringify(value, null, 2);
                return (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm text-gray-700 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <textarea
                      className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                      rows={5}
                      defaultValue={display}
                      onChange={(e) => handleJsonChange(key, e.target.value)}
                    />
                    {jsonErrors[key] && (
                      <span className="text-xs text-red-600 mt-1">
                        {jsonErrors[key]}
                      </span>
                    )}
                  </div>
                );
              }

              // Primitive: string, number, boolean, null
              return (
                <div key={key} className="flex flex-col">
                  <label className="text-sm text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    value={
                      value === null || value === undefined
                        ? ''
                        : typeof value === 'boolean'
                        ? String(value)
                        : String(value)
                    }
                    onChange={(e) => handlePrimitiveChange(key, e.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-6">
          <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={Object.values(jsonErrors).some(Boolean)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
