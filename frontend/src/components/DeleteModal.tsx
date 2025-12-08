'use client';

import React from 'react';
import { Trade } from '@/types';
import { Trash2 } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trade: Trade | null;
}

const DeleteModal = React.memo(({ isOpen, onClose, onConfirm, trade }: DeleteModalProps) => {
  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-md p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Delete Trade</h3>
          <p className="text-slate-400 mb-6">
            Are you sure you want to delete the trade for <span className="text-white font-medium">{trade.symbol}</span>? 
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DeleteModal.displayName = 'DeleteModal';

export default DeleteModal;
