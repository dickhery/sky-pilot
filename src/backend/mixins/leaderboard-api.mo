import List "mo:core/List";
import Leaderboard "../lib/leaderboard";
import Types "../types/leaderboard";

mixin (
  entries : List.List<Types.LeaderboardEntry>,
  nextEntryId : { var value : Nat },
) {
  /// Public query of the top scores. Cheap read — no authentication.
  public query func listLeaderboard() : async [Types.LeaderboardEntryView] {
    Leaderboard.listTop(entries);
  };

  /// Post a completed flight's total to the board. Requires Internet Identity.
  public shared ({ caller }) func submitLeaderboardScore(
    displayName : Text,
    planName : Text,
    plane : Types.Plane,
    weather : Types.Weather,
    total : Nat,
  ) : async Types.SubmitOutcome {
    Leaderboard.submit(entries, nextEntryId, caller, displayName, planName, plane, weather, total);
  };
};
