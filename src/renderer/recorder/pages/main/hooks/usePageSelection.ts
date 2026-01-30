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
  const [browserVariableSelectedElement, setBrowserVariableSelectedElement] = useState<{
    selectors: string[];
    domHtml: string;
    value: string;
    element_data?: Record<string, any>;
  } | null>(null);
  const [inputSelectedElement, setInputSelectedElement] = useState<{
    selectors: string[];
    domHtml: string;
    value: string;
    element_data?: Record<string, any>;
  } | null>(null);
  const [urlInputSelectedPageInfo, setUrlInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [titleInputSelectedPageInfo, setTitleInputSelectedPageInfo] = useState<PageInfo | null>(null);
  const [aiAssertSelectedPageInfo, setAiAssertSelectedPageInfo] = useState<PageInfo | null>(null);
  const [assertWithValueSelectedPageInfo, setAssertWithValueSelectedPageInfo] = useState<PageInfo | null>(null);
  const [assertWithValueSelectedElement, setAssertWithValueSelectedElement] = useState<{
    selectors: string[];
    domHtml: string;
    value: string;
    pageIndex?: number | null;
    pageUrl?: string | null;
    pageTitle?: string | null;
    element_data?: Record<string, any>;
  } | null>(null);
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
    browserVariableSelectedElement,
    setBrowserVariableSelectedElement,
    inputSelectedElement,
    setInputSelectedElement,
    urlInputSelectedPageInfo,
    setUrlInputSelectedPageInfo,
    titleInputSelectedPageInfo,
    setTitleInputSelectedPageInfo,
    aiAssertSelectedPageInfo,
    setAiAssertSelectedPageInfo,
    assertWithValueSelectedPageInfo,
    setAssertWithValueSelectedPageInfo,
    assertWithValueSelectedElement,
    setAssertWithValueSelectedElement,
    cssInputSelectedPageInfo,
    setCssInputSelectedPageInfo,
    cssInputSelectedElement,
    setCssInputSelectedElement,
  };
};

