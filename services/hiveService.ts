
import { HiveAccount, GlobalProps, FollowCount, HiveOperation, HAFResponse, HAFOperation } from '../types';

const HIVE_RPC = 'https://api.hive.blog';

async function hiveCall(method: string, params: any) {
  const response = await fetch(HIVE_RPC, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export const hiveService = {
  async getAccount(username: string): Promise<HiveAccount> {
    const accounts = await hiveCall('condenser_api.get_accounts', [[username]]);
    if (!accounts || accounts.length === 0) throw new Error('Account not found');
    return accounts[0];
  },

  async getGlobalProps(): Promise<GlobalProps> {
    return await hiveCall('condenser_api.get_dynamic_global_properties', []);
  },

  async getFollowCount(username: string): Promise<FollowCount> {
    return await hiveCall('condenser_api.get_follow_count', [username]);
  },

  async getAccountHistory(username: string): Promise<HiveOperation[]> {
    const history = await hiveCall('condenser_api.get_account_history', [username, -1, 20]);
    return history.map((item: any) => item[1]).reverse();
  },

  async getVestingDelegations(username: string): Promise<any[]> {
    return await hiveCall('condenser_api.get_vesting_delegations', [username, '', 50]);
  },

  /**
   * Fetches HAF operations with recursive pagination support
   */
  async getHAFOperations(
    username: string, 
    fromBlock: number, 
    opTypes: number[], 
    maxPages: number = 5
  ): Promise<HAFOperation[]> {
    let allOps: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    const opTypesParam = opTypes.join(',');

    do {
      const url = `https://api.hive.blog/hafah-api/accounts/${username}/operations?participation-mode=all&operation-types=${opTypesParam}&page-size=100&from-block=${fromBlock}&page=${currentPage}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) break;
        const data: HAFResponse = await response.json();
        
        if (data.operations_result) {
          allOps = [...allOps, ...data.operations_result];
        }
        
        totalPages = data.total_pages || 1;
        currentPage++;
      } catch (e) {
        console.error("HAF Page Fetch Error:", e);
        break;
      }
    } while (currentPage <= totalPages && currentPage <= maxPages);

    return allOps;
  },

  calculateHP(vests: string, globalProps: GlobalProps): number {
    const totalVestingFund = parseFloat(globalProps.total_vesting_fund_hive.split(' ')[0]);
    const totalVestingShares = parseFloat(globalProps.total_vesting_shares.split(' ')[0]);
    const userVests = parseFloat(vests.split(' ')[0]);
    return (userVests * totalVestingFund) / totalVestingShares;
  },

  getVestsToHpRatio(globalProps: GlobalProps): number {
    const totalVestingFund = parseFloat(globalProps.total_vesting_fund_hive.split(' ')[0]);
    const totalVestingShares = parseFloat(globalProps.total_vesting_shares.split(' ')[0]);
    return totalVestingFund / totalVestingShares;
  },

  calculateReputation(rep: string | number): number {
    const reputation = parseInt(rep.toString());
    if (isNaN(reputation)) return 25;
    let score = (Math.max(Math.log10(Math.abs(reputation)) - 9, 0) * (reputation < 0 ? -1 : 1) * 9) + 25;
    return Math.floor(score);
  }
};
