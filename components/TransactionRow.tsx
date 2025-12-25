
import React from 'react';
import { HiveOperation } from '../types';

interface TransactionRowProps {
  tx: HiveOperation;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ tx }) => {
  const opType = tx.op[0];
  const data = tx.op[1];
  const timestamp = new Date(tx.timestamp + 'Z').toLocaleString();

  const getLabel = () => {
    switch (opType) {
      case 'vote': return 'Vote';
      case 'comment': return data.parent_author === '' ? 'Post' : 'Comment';
      case 'transfer': return 'Transfer';
      case 'curation_reward': return 'Curation';
      case 'author_reward': return 'Author Reward';
      default: return opType.replace('_', ' ');
    }
  };

  const getDetails = () => {
    switch (opType) {
      case 'vote': return `to @${data.author} (${data.weight / 100}%)`;
      case 'comment': return `permlink: ${data.permlink.substring(0, 20)}...`;
      case 'transfer': return `to @${data.to}: ${data.amount}`;
      case 'curation_reward': return `${data.reward}`;
      default: return '';
    }
  };

  const getColorClass = () => {
    switch (opType) {
      case 'vote': return 'bg-blue-500/10 text-blue-400';
      case 'transfer': return 'bg-amber-500/10 text-amber-400';
      case 'comment': return 'bg-emerald-500/10 text-emerald-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <tr className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
      <td className="py-4 px-4">
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${getColorClass()}`}>
          {getLabel()}
        </span>
      </td>
      <td className="py-4 px-4 text-sm text-slate-300">
        {getDetails()}
      </td>
      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
        {timestamp}
      </td>
    </tr>
  );
};
