import List "mo:core/List";
import Types "../types/flight-logs";
import FlightLogs "../lib/flight-logs";
import WriteBudget "../lib/write-budget";

mixin (
  logs : List.List<Types.FlightLog>,
  nextLogId : { var value : Nat },
) {
  transient let lastLogWrite = WriteBudget.empty();

  /// List the caller's past flights, newest first.
  /// Each entry shows date, flight plan name, plane, and score breakdown.
  public shared query ({ caller }) func listFlightLogs() : async [Types.FlightLogView] {
    FlightLogs.listForPlayer(logs, caller);
  };

  /// Get a single flight log by id, scoped to the caller.
  /// Powers the detail view with the full score breakdown.
  public shared query ({ caller }) func getFlightLog(logId : Types.LogId) : async ?Types.FlightLogView {
    FlightLogs.getForPlayer(logs, caller, logId);
  };

  /// Persist a completed flight's score breakdown to the caller's flight log.
  /// Requires Internet Identity. Caps and a short write cooldown keep memory cheap.
  public shared ({ caller }) func recordFlightLog(
    completedAt : Int,
    planName : Text,
    plane : Types.Plane,
    weather : Types.Weather,
    score : Types.ScoreBreakdown,
  ) : async Types.FlightLogView {
    WriteBudget.allow(lastLogWrite, caller);
    FlightLogs.addLog(logs, nextLogId, caller, completedAt, planName, plane, weather, score);
  };
};
