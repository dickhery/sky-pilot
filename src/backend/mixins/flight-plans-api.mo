import FlightPlans "../lib/flight-plans";
import Types "../types/flight-plans";

mixin () {
  /// Public query: list all selectable flight plans for the level grid.
  public query func listFlightPlans() : async [Types.FlightPlan] {
    FlightPlans.listPlans();
  };

  /// Public query: look up a single flight plan by id.
  public query func getFlightPlan(planId : Types.PlanId) : async ?Types.FlightPlan {
    FlightPlans.getPlan(planId);
  };

  /// Public query: list the two selectable planes.
  public query func listPlanes() : async [Types.Plane] {
    FlightPlans.listPlanes();
  };

  /// Public query: list the three supported weather conditions.
  public query func listWeather() : async [Types.Weather] {
    FlightPlans.listWeather();
  };
};
