import React from 'react';

export interface RecorderAction {
  id: string;
  type: string;
  title: string;
  meta?: string;
  value?: string;
  time?: string;
}

export default function Action(props: { action: RecorderAction }): React.ReactElement;


