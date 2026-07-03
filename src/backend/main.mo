import List "mo:core/List";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import FlightLogsTypes "types/flight-logs";
import FlightLogsApi "mixins/flight-logs-api";
import FlightPlansApi "mixins/flight-plans-api";

actor {
  include MixinViews();

  // Stable state — types only, no initializers. Values come from the
  // migration chain in src/backend/migrations/.
  let accessControlState : AccessControl.AccessControlState;
  let flightLogs : List.List<FlightLogsTypes.FlightLog>;
  let nextLogId : { var value : Nat };

  include MixinAuthorization(accessControlState, null);
  include FlightLogsApi(flightLogs, nextLogId);
  include FlightPlansApi();
};
