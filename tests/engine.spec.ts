import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Action, Changes, Choice, Component, Components, Query, QueryFilter, Simple } from "../client/scripts/engine/types-engine.js";

const removeStaticFunctions = <T> (obj: T): Partial<T> => {
  //@ts-ignore
  delete obj.toJSON;
  //@ts-ignore
  delete obj.toString;

  return obj;
};

type Dice = Component<{
  sides: number,
  value: number
}>;

describe('Basic Engine Tests.', () => {
  let engine: GameEngine = new GameEngine();

  beforeEach(() => {
    engine = new GameEngine();
  });
  
  it('A component can be registered. It receives types and ID as attributes.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(removeStaticFunctions(obj)).to.deep.equal({
      id: '0',
      type: 'my-type',
      value: 'test'
    });
  });

  it('Components get an increasing ID number to reference them.', () => {
    const obj1 = engine.registerComponent({
      value: 'test'
    }, 'my-type');
    
    const obj2 = engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(obj1.id).to.equal('0');
    expect(obj2.id).to.equal('1');
  });

  it('If a Component is created, an automatic query for its type can be executed, that returns that object.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(engine.query('my-type')).to.deep.equal([removeStaticFunctions(obj)]);

    expect(engine.queries()).to.have.length(1);
  });

  it('If a Query is executed that is not registered, it returns [].', () => {
    expect(engine.queries()).to.have.length(0);
    expect(engine.query('nirvana')).to.deep.equal([]);
  });

  it('A custom query can be registered. If its called, it is executed against all components.', () => {
    type Fruit = {
      fruit: string,
      flavor: string
    };

    const apple = engine.registerComponent({
      fruit: 'apple',
      flavor: 'sour'
    }, 'fruit') as Component<Fruit>;
    const banana = engine.registerComponent({
      fruit: 'banana',
      flavor: 'sweet'
    }, 'fruit') as Component<Fruit>;
    const orange = engine.registerComponent({
      fruit: 'orange',
      flavor: 'sweet'
    }, 'fruit') as Component<Fruit>;

    engine.registerQuery('sweet-fruits', (engine) => (engine.query('fruit') as Simple<Component<Fruit>>[]).filter(c => c?.flavor === 'sweet'))
    
    // 1 for the type 'fruit', one custom one.
    expect(engine.queries()).to.have.length(2);
    expect(engine.query('sweet-fruits')).to.include(banana);
    expect(engine.query('sweet-fruits')).to.include(orange);
  });

  it('If a Component is registered, its change is registered.', () => {
    engine.registerComponent({
      value: 'test'
    }, 'my-type');

    expect(engine.changes()).to.have.length(1);
    expect(removeStaticFunctions(engine.changes().get('0'))).to.deep.equal({
      value: 'test',
      id: '0',
      type: 'my-type'
    });
  });

  it('If a component is modified retroactively, only this change is registered.', () => {
    type MyType = {value: number | string};

    const obj = engine.registerComponent({
      value: 100
    }, 'my-type') as Component<MyType>;

    // Some change!
    obj.value = 'abc';
    obj.value = 'def';

    expect((engine.changes().get('0') as MyType).value).to.equal('def');
  });

  it('If a component has a query attribute, it is resolved on the access.', () => {
    const obj: Simple<Component<{value: Query<unknown, string>}>> = engine.registerComponent({
      value: (self, engine) => 'hello world!' 
    }, 'my-type');

    // This looks like a property, but is implemented as a query!
    expect(obj.value).to.equal('hello world!');
  });

  
  it('If a component has a query attribute, it is resolved on the access and whenever a change is done.', () => {
    type MyType = {name: string, value: Query<MyType, string>};

    const obj: Simple<Component<MyType>> = engine.registerComponent({
      name: 'john',
      value: (self, engine) => `hello ${self.name}!`
    }, 'my-type');

    // This looks like a property, but is implemented as a query!
    expect(obj.value).to.equal('hello john!');

    obj.name = 'paul';
    expect(obj.value).to.equal('hello paul!');
  });

  it('If the query attribute is tried to be set to a different value, an exception is thrown.', () => {
    type MyType = {name: string, value: Query<MyType, string>};
    const obj: Simple<Component<MyType>> = engine.registerComponent({
      name: 'john',
      value: (self, engine) => `hello ${self.name}!`
    }, 'my-type');

    expect(() => {
      obj.value = 'something else, doesnt work!';
    }).to.throw(/query/i);
  });

  it('A component with a nested object inside it automatically extracts that object and registers it as an anonymous component.', () => {
    const obj = engine.registerComponent({
      nested: {
        value: 'test'
      },
      upper: 'upper'
    }, 'test');

    expect(obj.upper).to.equal('upper');
    expect(removeStaticFunctions(obj.nested)).to.deep.equal({id: '1', type: 'anonymous', value: 'test'}); // This is an anonymous registered component!
    expect(obj.nested.value).to.equal('test');

    expect(engine.components()).to.have.length(2);
  });

  it('A component with an array inside one of its properties generates an anonymous type for that array, too.', () => {
    const obj = engine.registerComponent({
      fields: ['A', 'B', 'C'],
      value: 'test'
    }, 'test');

    expect(obj.value).to.equal('test');
    expect(obj.fields).to.include('A');
    expect(obj.fields).to.include('B');
    expect(obj.fields).to.include('C');

    // These values are naturally available, although basically never needed.
    // @ts-ignore
    expect(obj.fields.id).to.equal('1');
    // @ts-ignore
    expect(obj.fields.type).to.equal('anonymous');

    expect(obj.fields[0]).to.deep.equal('A');

    expect(engine.components()).to.have.length(2);
  });

  it('A component with an array property that holds more nested objects works as expected.', () => {
    const complex = engine.registerComponent({
      fields: [{nested: '123'}, {nested: '234'}, {nested: '345', flag: true}]
    }, 'test');

    expect(engine.components()).to.have.length(5);
    // Check some field - all is superficious.

    expect(complex.fields[2].flag).to.equal(true);
  });

  it('If a component is directly related to another component, it can be accessed as usual.', () => {
    type MyType = {value: number, reference?: MyType};

    const obj1: MyType = engine.registerComponent({
      reference: undefined,
      value: 1
    }, 'test-1');
    const obj2: MyType = engine.registerComponent({
      reference: undefined,
      value: 2
    }, 'test-2');

    // We don't care about the syntax, just the semantic here - types are secondary for now.
    obj1.reference = obj2;
    obj2.reference = obj1;

    // Obj1 loops back to itself!
    expect(removeStaticFunctions(obj1.reference.reference)).to.deep.equal({
      id: '0',
      type: 'test-1',
      reference: obj2,
      value: 1
    });
  });

  it('If a component is directly related to another component via a query, it can be accessed as usual.', () => {
    type MyType = Component<{value: number, reference: Query<MyType, MyType>}>;

    const obj1: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-2') as Simple<MyType>[])[0], // Reference created via query!
      value: 1
    }, 'test-1');
    const obj2: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-1') as Simple<MyType>[])[0], // Reference created via query!
      value: 2
    }, 'test-2');

    // Obj1 loops back to itself!
    expect(removeStaticFunctions(obj1.reference.reference)).to.deep.equal({
      id: '0',
      type: 'test-1',
      reference: obj2,
      value: 1
    });
  });

  it('If a component is serialized, it is serialized into JSON format.', () => {
    const test = engine.registerComponent({
      value: 'test'
    }, 'test');

    const serialized = JSON.stringify(test);

    expect(JSON.parse(serialized)).to.deep.equal({
      value: 'test',
      id: '0',
      type: 'test'
    })
  });

  
  it('If a component with a relation to another component is serialized, the referenced component is related to via an ID identifier "@ID".', () => {
    type MyType = Component<{value: number, reference: Query<MyType, MyType>}>;

    const obj1: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-2') as Simple<MyType>[])[0], // Reference created via query!
      value: 1
    }, 'test-1');
    const obj2: Simple<MyType> = engine.registerComponent({
      reference: (self, engine) => (engine.query('test-1') as Simple<MyType>[])[0], // Reference created via query!
      value: 2
    }, 'test-2');

    const serialized = JSON.stringify(obj1);
    console.log(serialized);

    expect(JSON.parse(serialized)).to.deep.equal({
      value: 1,
      reference: '@1',
      id: '0',
      type: 'test-1'
    })
  });

  it('If a component is registered without a name, it receives a default name.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, 'test-type');

    expect(obj.toString()).to.equal('Component #0 (test-type)');
  });
  
  it('If a component is registered with a name, it is rendered when this Component is stringified.', () => {
    const obj = engine.registerComponent({
      value: 'test'
    }, 'test-type', 'My cool name!');

    type a = typeof obj['toString'];
    type b = typeof obj['toJSON'];

    expect(obj.toString()).to.equal('My cool name!');
  });

  it('If a component is registered that has a nested property, but that property is already registered, it wont automatically be registered another time.', () => {
    const nested = engine.registerComponent({
      value: 'im nested'
    }, 'nested');

    const parent = engine.registerComponent({
      value: 'im parent',
      nested: nested
    }, 'parent');

    expect(engine.components()).to.have.length(2);
  });

  it('A user can register into the game with a User Interface.', (done) => {
    engine.registerInterface({
      // This function is called whenever a Tick happens and the Game State was updated.
      tickHandler: (delta: Changes, choices: Choice[]) => {
        done();
      },
      actorId: 'Player 1'
    });

    // When the game starts, an initial tick is issued.
    engine.tick();
  });

  it('A user is informed about any changes to the game state. On more changes after one tick, only the delta changes since the last tick are transmitted.', (done) => {
    let ticked = 0;

    const obj = engine.registerComponent({
      value: 'test'
    }, 'test');

    engine.registerInterface({
      tickHandler: (delta: Changes, choices: Choice[]) => {
        if(ticked === 0) {
          expect(delta).to.have.length(1);
          expect(removeStaticFunctions(delta.get('0'))).to.deep.equal({
            id: '0',
            value: 'test',
            type: 'test'
          });
        }

        if(ticked === 1) {
          expect(delta).to.have.length(1);
          console.log(delta.get('0'));
          expect(delta.get('0')).to.deep.equal({
            value: 'another test',
          });
        }

        ticked++;
        if(ticked == 2) {
          done();
        }
      },
      actorId: 'player-1'
    })

    engine.tick();
    obj.value = 'another test';
    engine.tick();
  });

  it('An Action can be registered.', () => {
    const roll: Action<{target: Dice}, {target: Dice}> = engine.registerAction({
      name: 'roll',
      execute: (engine, parameters: {
        target: Dice
      }) => {
        parameters.target.value = Math.floor(Math.random() * parameters.target.sides);

        return parameters;
      },
      log: (parameters) => `Dice ${parameters.target} was rolled`
    });

    expect(engine.actions()).to.have.length(1);
  });

  it('A rule can be registered.', () => {
    engine.registerRule({
      name: 'A rule that does nothing!.',
      type: 'positive',
      handler: (engine) => {
        return [];
      }
    });

    expect(engine.rules()).to.have.length(1);
  });
});