import React, { useMemo, useState } from 'react';
import './Main.css';
// @ts-ignore - JSX component with separate d.ts
import Action from '../../components/action/Action.jsx';

const mockActions = [
  { id: '1', type: 'navigate', title: 'Navigate to https://testcase.rikkei.org', meta: 'https://testcase.rikkei.org', time: '4:56:11 PM' },
  { id: '2', type: 'type', title: 'Enter "hoangdinhhung20012003" in Enter your admin email', meta: '#admin-email', value: 'hoangdinhhung20012003', time: '4:56:11 PM' },
  { id: '3', type: 'type', title: 'Enter "20210399" in Enter your password', meta: '#admin-password', value: '20210399', time: '4:56:11 PM' },
  { id: '4', type: 'keydown', title: 'Key down on Enter your password', meta: '#admin-password', value: 'Enter', time: '4:56:11 PM' },
  { id: '5', type: 'type', title: 'Enter "hoangdinhhung20012003..." in Enter your admin email', meta: '#admin-email', value: 'hoangdinhhung20012003@gmail.com', time: '4:56:11 PM' },
  { id: '6', type: 'keydown', title: 'Key down on Enter your admin email', meta: '#admin-email', value: 'Enter', time: '4:56:11 PM' },
  { id: '7', type: 'click', title: 'Click on …', meta: '.admin-login-form', time: '4:56:11 PM' },
];

const Main: React.FC = () => {
  const [url, setUrl] = useState('');
  const actions = useMemo(() => mockActions, []);

  return (
    <div className="rcd-page">
      <div className="rcd-topbar">
        <input className="rcd-url" placeholder="Type your URL here.." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="rcd-topbar-actions">
          <button className="rcd-ctrl rcd-play" title="Play">▶</button>
          <button className="rcd-ctrl" title="Save">💾</button>
          <button className="rcd-ctrl" title="Export">📤</button>
        </div>
      </div>

      <div className="rcd-content">
        <h3 className="rcd-title">Actions</h3>
        <div className="rcd-actions-list">
          {actions.map((a) => (
            <Action key={a.id} action={a} />
          ))}
        </div>
        <div className="rcd-footer">
          <button className="rcd-run">Run Test</button>
        </div>
      </div>
    </div>
  );
};

export default Main;


