import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import { Case } from '../../types';

interface DeleteCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DeleteCaseModal: React.FC<DeleteCaseModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onConfirm,
  isDeleting
}) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Delete failed:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Case"
      size="md"
      showCloseButton={true}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Warning: This action cannot be undone</h4>
            <p className="text-sm text-red-700 mt-1">
              Deleting this case will permanently remove all associated data.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Are you sure you want to delete the case for{' '}
            <span className="font-semibold">
              {caseData.worker.firstName} {caseData.worker.lastName}
            </span>
            ?
          </h4>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">This will permanently delete:</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• All case documents and uploaded files</li>
              <li>• All communications and case notes</li>
              <li>• All stakeholder information</li>
              <li>• All compensation and PIAWE calculations</li>
              <li>• All review dates and RTW plans</li>
              <li>• All supervisor notes and feedback</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Case Details:</strong> {caseData.claimNumber} • {caseData.employer.name}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Case
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteCaseModal;
