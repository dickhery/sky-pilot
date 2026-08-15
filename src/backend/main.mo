import List "mo:core/List";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import FlightLogsTypes "types/flight-logs";
import LeaderboardTypes "types/leaderboard";
import FlightLogsApi "mixins/flight-logs-api";
import FlightPlansApi "mixins/flight-plans-api";
import LeaderboardApi "mixins/leaderboard-api";

actor {
  include MixinViews();

  // Stable state — types only, no initializers. Values come from the
  // migration chain in src/backend/migrations/.
  let accessControlState : AccessControl.AccessControlState;
  let flightLogs : List.List<FlightLogsTypes.FlightLog>;
  let nextLogId : { var value : Nat };
  let leaderboard : List.List<LeaderboardTypes.LeaderboardEntry>;
  let nextLeaderboardId : { var value : Nat };

  include MixinAuthorization(accessControlState, null);
  include FlightLogsApi(flightLogs, nextLogId);
  include FlightPlansApi();
  include LeaderboardApi(leaderboard, nextLeaderboardId);
};
