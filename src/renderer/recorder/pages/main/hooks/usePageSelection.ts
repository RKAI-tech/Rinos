import { useState } from 'react';

export interface PageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

export const usePageSelection = () => {
  const [navigateSelectedPageInfo, setNavigateSelectedPageInfo] = useState<PageInfo | null>(null);
  const [browserActionSelectedPageInfo, setBrowserActionSelectedPageInfo] = useState<PageInfo | null>(null);
  const [addBrowserStorageSelectedPageInfo, setAddBrowserStorageSelectedPageInfo] = useState<PageInfo | null>(null);
  const [apiRequestSelectedPageInfo, setApiRequestSelectedPageInfo] = useState<PageInfo | null>(null);
  const [urlInputSelectedPageInfo, setUrlInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [titleInputSelectedPageInfo, setTitleInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [aiAssertSelectedPageInfo, setAiAssertSelectedPageInfo] = useState<PageInfo | null>(null);
  const [cssInputSelectedPageInfo, setCssInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [cssInputSelectedElement, setCssInputSelectedElement] = useState<{
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  } | null>(null);

  return {
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
    aiAssertSelectedPageInfo,
    setAiAssertSelectedPageInfo,
    cssInputSelectedPageInfo,
    setCssInputSelectedPageInfo,
    cssInputSelectedElement,
    setCssInputSelectedElement,
  };
};

