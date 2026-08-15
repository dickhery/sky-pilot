import List "mo:core/List";
import Leaderboard "../lib/leaderboard";
import Types "../types/leaderboard";

mixin (
  entries : List.List<Types.LeaderboardEntry>,
  nextEntryId : { var value : Nat },
) {
  /// Public query of the top scores for every catalog map. Cheap read —
  /// no authentication, one call for the whole board.
  public query func listLeaderboard() : async [Types.LeaderboardEntryView] {
    Leaderboard.listTop(entries);
  };

  /// Post a completed flight's total to that map's board. Requires Internet Identity.
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
