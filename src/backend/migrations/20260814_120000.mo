import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  public type Plane = {
    #cessna;
    #gulfstream;
  };

  public type Weather = {
    #daytime;
    #nighttime;
    #partlyCloudy;
  };

  public type ScoreBreakdown = {
    speed : Nat;
    landingSmoothness : Nat;
    total : Nat;
  };

  public type FlightLog = {
    id : Nat;
    playerId : Principal;
    completedAt : Int;
    planName : Text;
    plane : Plane;
    weather : Weather;
    score : ScoreBreakdown;
  };

  public type LeaderboardEntry = {
    id : Nat;
    playerId : Principal;
    displayName : Text;
    planName : Text;
    plane : Plane;
    weather : Weather;
    total : Nat;
    submittedAt : Int;
  };

  type OldActor = {
    accessControlState : AccessControlState;
    flightLogs : List.List<FlightLog>;
    nextLogId : { var value : Nat };
  };

  type NewActor = {
    accessControlState : AccessControlState;
    flightLogs : List.List<FlightLog>;
    nextLogId : { var value : Nat };
    leaderboard : List.List<LeaderboardEntry>;
    nextLeaderboardId : { var value : Nat };
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      flightLogs = old.flightLogs;
      nextLogId = old.nextLogId;
      leaderboard = List.empty();
      nextLeaderboardId = { var value = 1 };
    };
  };
};
