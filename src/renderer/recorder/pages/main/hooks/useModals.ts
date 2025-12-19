import { useState } from 'react';

export const useModals = () => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBasicAuthOpen, setIsBasicAuthOpen] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [isTitleInputOpen, setIsTitleInputOpen] = useState(false);
  const [isCssInputOpen, setIsCssInputOpen] = useState(false);
  const [isAssertWithValueModalOpen, setIsAssertWithValueModalOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDatabaseExecutionOpen, setIsDatabaseExecutionOpen] = useState(false);
  
  // State để track các modal trong ActionTab
  const [isActionTabWaitOpen, setIsActionTabWaitOpen] = useState(false);
  const [isActionTabNavigateOpen, setIsActionTabNavigateOpen] = useState(false);
  const [isActionTabApiRequestOpen, setIsActionTabApiRequestOpen] = useState(false);
  const [isActionTabAddBrowserStorageOpen, setIsActionTabAddBrowserStorageOpen] = useState(false);
  const [isActionTabBrowserActionOpen, setIsActionTabBrowserActionOpen] = useState(false);

  return {
    isDetailOpen,
    setIsDetailOpen,
    isAiModalOpen,
    setIsAiModalOpen,
    isBasicAuthOpen,
    setIsBasicAuthOpen,
    isConfirmCloseOpen,
    setIsConfirmCloseOpen,
    isUrlInputOpen,
    setIsUrlInputOpen,
    isTitleInputOpen,
    setIsTitleInputOpen,
    isCssInputOpen,
    setIsCssInputOpen,
    isAssertWithValueModalOpen,
    setIsAssertWithValueModalOpen,
    isAddActionOpen,
    setIsAddActionOpen,
    isDeleteAllOpen,
    setIsDeleteAllOpen,
    isDatabaseExecutionOpen,
    setIsDatabaseExecutionOpen,
    isActionTabWaitOpen,
    setIsActionTabWaitOpen,
    isActionTabNavigateOpen,
    setIsActionTabNavigateOpen,
    isActionTabApiRequestOpen,
    setIsActionTabApiRequestOpen,
    isActionTabAddBrowserStorageOpen,
    setIsActionTabAddBrowserStorageOpen,
    isActionTabBrowserActionOpen,
    setIsActionTabBrowserActionOpen,
  };
};

