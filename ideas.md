# Game

`state` The user provided state for the given game in freeform. Representations differ based on the place used. This state describes a pure _static_ view. 
Its implementation might rely on queries.
- Server-In-Memory: Group of Components, either manually registered or automatically (for nested objects). Realized using a `Map<ID, Component>` with a Proxy around each Component to handle the lifecycle.
- Dynamic accesses are implemented using functions. These can not be set. Within a single game tick, the values of these functions is cached.
- These Components can be modified in the context of `Actions` and `Triggers`. To them, the Components look and behave like traditional objects. If one object is referenced in multiple scenarios, the modifier has to manually keep track of this. The Game State is your job!
- The proxy around each Component allows easy serialization of the entire game state and easy tracking of modified properties.
- Queries can be used to fasten the execution. Queries are static abilities that don't belong to a component. They are calculated lazily once during each game state and allow easy querying. They select a subset of all components.

# Server


# Client

- Receives a `Map<ID, Partial<Component>>` that describes the changes done so far. These changes have to be integrated into the 
