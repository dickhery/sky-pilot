import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Access control state shape (inlined from caffeineai-authorization/access-control.mo).
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // Flight log entry shape (inlined from types/flight-logs.mo).
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

  // First migration: introduce all stable state for the flight-sim canister.
  // Fresh install starts from an empty actor.
  type OldActor = {};
  type NewActor = {
    accessControlState : AccessControlState;
    flightLogs : List.List<FlightLog>;
    nextLogId : { var value : Nat };
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      flightLogs = List.empty();
      nextLogId = { var value = 1 };
    };
  };
};
