import List "mo:core/List";
import Principal "mo:core/Principal";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import FlightLogsTypes "types/flight-logs";
import FlightPlansTypes "types/flight-plans";
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

  // Cycle filter only — not an access-control boundary.
  // Drops oversized ingress and anonymous writes before Candid decode.
  // Internet Identity still needs an anonymous start call.
  system func inspect({
    caller : Principal;
    arg : Blob;
    msg : {
      #__accessControlState : () -> ();
      #__flightLogs : () -> (?Nat, ?Nat);
      #__leaderboard : () -> (?Nat, ?Nat);
      #__nextLeaderboardId : () -> ();
      #__nextLogId : () -> ();
      #_initialize_access_control : () -> ();
      #_internet_identity_sign_in_finish : () -> ();
      #_internet_identity_sign_in_start : () -> ();
      #assignCallerUserRole : () -> (Principal, AccessControl.UserRole);
      #getCallerUserRole : () -> ();
      #getFlightLog : () -> FlightLogsTypes.LogId;
      #getFlightPlan : () -> FlightPlansTypes.PlanId;
      #isCallerAdmin : () -> ();
      #listFlightLogs : () -> ();
      #listFlightPlans : () -> ();
      #listLeaderboard : () -> ();
      #listPlanes : () -> ();
      #listWeather : () -> ();
      #recordFlightLog : () -> (
        Int,
        Text,
        FlightLogsTypes.Plane,
        FlightLogsTypes.Weather,
        FlightLogsTypes.ScoreBreakdown,
      );
      #submitLeaderboardScore : () -> (
        Text,
        Text,
        LeaderboardTypes.Plane,
        LeaderboardTypes.Weather,
        Nat,
      );
    };
  }) : Bool {
    if (arg.size() > 8_192) {
      return false;
    };
    switch (msg) {
      case (#_internet_identity_sign_in_start _) { true };
      case (#recordFlightLog _) { not caller.isAnonymous() };
      case (#submitLeaderboardScore _) { not caller.isAnonymous() };
      case (#assignCallerUserRole _) { not caller.isAnonymous() };
      case (#_initialize_access_control _) { not caller.isAnonymous() };
      case (#_internet_identity_sign_in_finish _) { not caller.isAnonymous() };
      case (_) { true };
    };
  };
};
