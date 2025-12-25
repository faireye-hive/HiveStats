
export interface HiveAccount {
  name: string;
  reputation: string | number;
  post_count: number;
  voting_manabar: {
    current_mana: string | number;
    last_update_time: number;
  };
  balance: string;
  hbd_balance: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  posting_json_metadata: string;
  json_metadata: string;
  created: string;
  last_vote_time: string;
  last_post: string;
}

export interface GlobalProps {
  head_block_number: number;
  total_vesting_fund_hive: string;
  total_vesting_shares: string;
}

export interface FollowCount {
  follower_count: number;
  following_count: number;
}

export interface HiveOperation {
  timestamp: string;
  op: [string, any];
  trx_id: string;
}

export interface HAFAsset {
  amount: string;
  precision: number;
  nai: string;
}

export type HiveAsset = string | HAFAsset;

export interface HAFOperation {
  op: {
    type: string;
    value: any;
  };
  block: number;
  trx_id: string;
}

export interface HAFVoteOperation extends HAFOperation {
  op: {
    type: "effective_comment_vote_operation";
    value: {
      voter: string;
      author: string;
      weight: number;
      rshares: number;
      total_vote_weight: number;
      permlink: string;
      pending_payout: HAFAsset;
    };
  };
}

export interface HAFAuthorRewardOperation extends HAFOperation {
  op: {
    type: "author_reward_operation";
    value: {
      author: string;
      permlink: string;
      hbd_payout: HiveAsset;
      hive_payout: HiveAsset;
      vesting_payout: HiveAsset;
    };
  };
}

export interface HAFBenefactorRewardOperation extends HAFOperation {
  op: {
    type: "comment_benefactor_reward_operation";
    value: {
      benefactor: string;
      author: string;
      permlink: string;
      hbd_payout: HiveAsset;
      hive_payout: HiveAsset;
      vesting_payout: HiveAsset;
    };
  };
}

export interface HAFWitnessRewardOperation extends HAFOperation {
  op: {
    type: "witness_reward_operation";
    value: {
      witness: string;
      shares: HiveAsset;
    };
  };
}

export interface HAFCurationRewardOperation extends HAFOperation {
  op: {
    type: "curation_reward_operation";
    value: {
      curator: string;
      reward: HiveAsset;
      author: string;
      permlink: string;
      comment_author?: string;
      comment_permlink?: string;
    };
  };
}

export interface HAFResponse {
  total_operations: number;
  total_pages: number;
  operations_result: any[];
}

export interface AnalyticsData {
  authorHBD: number;
  authorHP: number;
  curationHP: number;
  pendingHBD: number;
  distribution: any[];
  dailyData: any[];
  pipelineData: any[];
  estDailyAuthor: number;
  estDailyCuration: number;
  circleJerk: any[];
  delegationROI: any[];
  totalDelegatedOut: number;
  totalDelegatedIn: number;
  meanBalanceIndex: number;
  pendingClaimsCount: number;
  uniquePendingVotes: HAFVoteOperation[];
  curationAPR: number;
  authorAPR: number;
  manaPercent: number;
}

export interface DashboardData {
  account: HiveAccount;
  followCount: FollowCount;
  hp: number;
  history: HiveOperation[];
  votes: HAFVoteOperation[];
  authorRewards: HAFAuthorRewardOperation[];
  benefactorRewards: HAFBenefactorRewardOperation[];
  curationRewards: HAFCurationRewardOperation[];
  witnessRewards: HAFWitnessRewardOperation[];
  vestsToHpRatio: number;
  headBlock: number;
  delegations: any[];
}
