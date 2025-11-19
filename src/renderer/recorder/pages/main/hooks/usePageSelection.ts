import { useState } from 'react';

export interface PageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

export const usePageSelection = () => {
  const [waitSelectedPageInfo, setWaitSelectedPageInfo] = useState<PageInfo | null>(null);
  const [navigateSelectedPageInfo, setNavigateSelectedPageInfo] = useState<PageInfo | null>(null);
  const [browserActionSelectedPageInfo, setBrowserActionSelectedPageInfo] = useState<PageInfo | null>(null);
  const [addBrowserStorageSelectedPageInfo, setAddBrowserStorageSelectedPageInfo] = useState<PageInfo | null>(null);
  const [apiRequestSelectedPageInfo, setApiRequestSelectedPageInfo] = useState<PageInfo | null>(null);
  const [urlInputSelectedPageInfo, setUrlInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [titleInputSelectedPageInfo, setTitleInputSelectedPageInfo] = useState<PageInfo | null>(null);

  return {
    waitSelectedPageInfo,
    setWaitSelectedPageInfo,
    navigateSelectedPageInfo,
    setNavigateSelectedPageInfo,
    browserActionSelectedPageInfo,
    setBrowserActionSelectedPageInfo,
    addBrowserStorageSelectedPageInfo,
    setAddBrowserStorageSelectedPageInfo,
    apiRequestSelectedPageInfo,
    setApiRequestSelectedPageInfo,
    urlInputSelectedPageInfo,
    setUrlInputSelectedPageInfo,
    titleInputSelectedPageInfo,
    setTitleInputSelectedPageInfo,
  };
};

