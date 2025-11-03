import React from 'react';
import ApiRequestModal from '../api_request_modal/ApiRequestModal';
import { ApiRequestData } from '../../types/actions';

interface ApiModelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ApiRequestData) => void;
  initialData?: Partial<ApiRequestData>;
}

// Thin wrapper around ApiRequestModal to serve as API Model in AI Assert context
const ApiModel: React.FC<ApiModelProps> = ({ isOpen, onClose, onConfirm, initialData }) => {
  return (
    <ApiRequestModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      initialData={initialData}
    />
  );
};

export default ApiModel;


