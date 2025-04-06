import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Component, QueryFilter } from "../client/scripts/engine/types-engine.js";

describe('Basic Engine Tests.', () => {
  let engine: GameEngine<''> = new GameEngine();

  beforeEach(() => {
    engine = new GameEngine();
  })
  
  it('When a Component is added, it is accessible through either general components or its types.', () => {
    const myObj = {value: 'test'};

    const engine = new GameEngine();
    engine.registerComponent(myObj, 'something');

    expect(engine.components).length(1);

    expect(engine.components[0].id).equals('0');
    expect(engine.components[0].types).contains('something');
    // @ts-expect-error
    expect(engine.components[0].value).equals('test');
  });
  
  it('When a Component is added, if one of its properties ("__$") is lazily initialized, it can be accessed.', () => {
    const myObj: {sides: number, value$: number} = engine.registerComponent({
      sides: 6,
      value$: (_engine, self) => self.sides
    }, 'die');

    expect(engine.components).length(1);

    expect(myObj.sides).equals(6);
    expect(myObj.value$).equals(6);
    expect(myObj.value$).equals(6);
    expect(myObj.value$).equals(6);
  });
  
  it('Lazy properties are initialized directly after object creation.', () => {
    const obj = engine.registerComponent({
      value: '123',
      lazy$: (engine, self) => engine.registerComponent({
        boy: self.value + '$'
      }, 'some lazy boi')
    }, 'value') as {value: string, lazy$: {boy: string}};

    expect(engine.components).length(2);
    
    // The inner component should be registered first.
    const first = engine.components[1] as Component<typeof obj>;

    expect(first.id).equals('0');
    expect(first.value).equals('123');
    expect(first.lazy$).deep.equal({boy: '123$', id: '1', types: ['some lazy boi']});
    expect(first.lazy$.boy).equals('123$');

    // The outer component should be registered second.
    const second = engine.components[0] as Component<{boy: string}>;

    expect(second.id).equals('1');
    expect(second.types).deep.equal(['some lazy boi']);
    expect(second.boy).equals('123$');
  });

  it('Registered components can be accessed through queries. Natively, each used type registers an own simple query.', () => {
    engine.registerComponent({
      hello: 'world'
    }, ['simple', 'easy']);

    expect(engine.query('simple')).to.length(1);

    const obj = engine.query('simple')[0];

    expect(obj).to.deep.equal({id: '0', types: ['simple', 'easy'], hello: 'world'});
    expect(engine.query('easy')[0]).to.deep.equal(obj);
  });

  it('If a component features a query attribute, it is automatically resolved when accessed.', () => {
    // Simple examples.
    engine.registerComponent({
      test: 123
    }, 'test');
    engine.registerComponent({
      test: 234
    }, 'test');
    engine.registerComponent({
      test: 345
    }, 'test');

    const query = engine.registerComponent({
      values: {
        get: (engine) => engine.query('test')
      }
    }, 'query-test') as {values: {test: number}[]};

    expect(Array.isArray(query.values)).to.be.true;
    expect(query.values).to.be.length(3);

    expect(query.values.filter(v => v.test === 123)).to.have.length(1);
    expect(query.values.filter(v => v.test === 234)).to.have.length(1);
    expect(query.values.filter(v => v.test === 345)).to.have.length(1);
  });

  
  it('If a component features a query attribute, its cached value is updated on access, if a change happened since then.', () => {
    // Registered, but no targets exist yet!
    const query = engine.registerComponent({
      values: {
        get: (engine) => engine.query('test')
      }
    }, 'query-test') as {values: {test: number}[]};
    expect(query.values).to.be.length(0);

    // Simple examples.
    engine.registerComponent({
      test: 123
    }, 'test');

    expect(query.values).to.be.length(1);

    engine.registerComponent({
      test: 234
    }, 'test');
    expect(query.values).to.be.length(2);

    engine.registerComponent({
      test: 345
    }, 'test');
    expect(query.values).to.be.length(3);
  });

  it('If a component features a query attribute that points to itself, it is updated whenever that property of itself changes.', () => {
    const obj: {name: string, greeting: string} = engine.registerComponent({
      name: 'John',
      greeting: {
        get: (engine, self) => `Hello ${self.name}!`
      }
    }, 'person');

    expect(obj.greeting).to.be.equal('Hello John!');

    // We modify the component and thus expect a change in its query attribute.
    obj.name = 'Lutz';
    expect(obj.greeting).to.be.equal('Hello Lutz!');
  });

  it('If a component is modified, it is recorded in the change map.', () => {
    const obj: Component<{test: number}> = engine.registerComponent({
      test: 123
    }, 'test');

    obj.test = 999;

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get(obj.id)).to.deep.equal({
      // This component was newly created!
      id: '0',
      types: ['test'],
      test: 999
    });
  });

  it('If the property of a component is modified multiple times, only the last value is recorded in the change map.', () => {
    const obj: Component<{test: number}> = engine.registerComponent({
      test: 123
    }, 'test');

    obj.test = 999;
    obj.test = 1000;

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get(obj.id)!.test).to.equal(1000);
  });

  it('If a component is registered, it appears in the changes.', () => {
    engine.registerComponent({
      test: 123
    }, 'test');

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get('0')).to.deep.equal({
      id: '0',
      types: ['test'],
      test: 123
    });
  });
  
  it('If a component is registered with a query attribute, the initially resolved attribute is added to it.', () => {
    const obj: {test: number, test2: number} = engine.registerComponent({
      test: 123,
      // TODO: Remove test2 from self here, because self-reference....
      test2: {
        get: (engine, self) => self.test - 111
      }
    }, 'test');

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get('0')).to.deep.equal({
      id: '0',
      types: ['test'],
      test: 123,
      test2: 12
    });
  });
  
  it('If a component is registered with a query attribute, and it is accessed, the returned value of that query is added to the changes.', () => {
    const obj: {test: number, test2: number} = engine.registerComponent({
      test: 123,
      // TODO: Remove test2 from self here, because self-reference....
      test2: {
        get: (engine, self) => self.test - 111
      }
    }, 'test');

    obj.test2;

    expect(engine.changes()).to.have.length(1);
    expect(engine.changes().get('0')).to.deep.equal({
      id: '0',
      types: ['test'],
      test: 123,
      test2: 12
    });
  });

  it('If two components reference each other via queries, no infinite loop happens.', () => {
    type Die = {sides: number, paired: Die | undefined};

    const die1 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;
    
    const die2 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;

    expect(die1.paired).to.be.undefined;
    expect(die2.paired).to.be.undefined;
  });
 
  it('If two components reference each other via queries, if one of the values is set, it can later be retrieved.', () => {
    type Die = {sides: number, paired: Die | undefined};

    const die1 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;
    
    const die2 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;

    // Some pairing action...
    die1.paired = die2;

    expect(die1.paired).to.deep.equal(die2);
    expect(die2.paired).to.deep.equal(die1);
  });

  it('If two components reference each other via queries, if one of the values is set, and then later reset, it returns to the original behavior.', () => {
    type Die = {sides: number, paired: Die | undefined};

    const die1 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;
    
    const die2 = engine.registerComponent({
      sides: 6,
      paired: {
        get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0]
      }
    }, 'die') as Component<Die>;

    // Some pairing action...
    console.info('PAIRING DICE...');
    die1.paired = die2;
    console.info('DICE ARE PAIRED');
    
    expect(die1.paired).to.deep.equal(die2);
    expect(die2.paired).to.deep.equal(die1);

    // We later revoke this relationship!
    console.info('REVOKING RELATIONSHIP...');
    die1.paired = undefined;
    console.info('RELATIONSHIP REVOKED');

    expect(die1.paired).to.be.undefined;
    expect(die2.paired).to.be.undefined;
  });

  
  it('If two components reference each other via queries, if one of the values is set, and then later reset on the other paired value(!), it returns to the original behavior.', () => {
    type Die = {sides: number, paired: Die | undefined};

    const pairQuery: QueryFilter<Component<Die> | undefined, Die> = {
      // When queried: return this.
      get: (engine, self) => (engine.query('die') as Component<Die>[]).filter(d => d.paired?.id === self.id)[0],
      // When set: execute this.
      set: (engine, self, current, next) => {
        if(current !== undefined) {
          console.error(self, current);
          current.paired = next;
        }
      }
    };

    const die1 = engine.registerComponent({
      sides: 6,
      paired: pairQuery
    }, 'die') as Component<Die>;
    
    const die2 = engine.registerComponent({
      sides: 6,
      paired: pairQuery
    }, 'die') as Component<Die>;

    // Some pairing action...
    console.info('PAIRING DICE...');
    die1.paired = die2;
    console.info('DICE ARE PAIRED');
    
    expect(die1.paired).to.deep.equal(die2);
    expect(die2.paired).to.deep.equal(die1);

    // We later revoke this relationship!
    console.info('REVOKING RELATIONSHIP...');
    die2.paired = undefined; // IMPORTANT: Other Die is referenced!
    console.info('RELATIONSHIP REVOKED');

    expect(die1.paired).to.be.undefined;
    expect(die2.paired).to.be.undefined;
  });

  it('When serializing a Component, it is returned in JSON format.', () => {
    const obj = engine.registerComponent({
      test: 123
    }, 'test');

    expect(JSON.parse(JSON.stringify(obj))).to.deep.equal({
      id: "0",
      types: ['test'],
      test: 123
    });
  });

  
  it('When serializing a Component with a lazy initialzed property, the rendered variant is returned in JSON format.', () => {
    const obj: {test: number, lazy$: number} = engine.registerComponent({
      test: 123,
      lazy$: (engine, self) => self.test + 1
    }, 'test');

    expect(JSON.parse(JSON.stringify(obj))).to.deep.equal({
      id: "0",
      types: ['test'],
      test: 123,
      lazy$: 124
    });
  });

  it('When serializing a Component with a query properted, the last known value is returned in its JSON format.', () => {
    type Test = {test: number, another: number};

    const obj1: Test = engine.registerComponent({
      test: 123,
      another: {
        get: (_engine, self) => self.test * 2
      }
    }, 'test');

    // Modification in-between...
    obj1.test = 16;

    expect(JSON.parse(JSON.stringify(obj1))).to.deep.equal({
      id: "0",
      types: ['test'],
      test: 16,
      another: 32
    });
  });

  it('When serializing a Component with a reference to another component, that referenced is encoded using the ID of the other component.', () => {
    type Test = {test: number, another: Test};

    const obj1: Test = engine.registerComponent({
      test: 123,
      another: {
        get: (engine, self) => (engine.query('test') as Component<Test>[]).filter(t => t.id !== self.id)[0]
      }
    }, 'test');

    // A reference object that can be linked!
    const obj2: Test = engine.registerComponent({
      test: 123,
      another: {
        get: (engine, self) => (engine.query('test') as Component<Test>[]).filter(t => t.id !== self.id)[0]
      }
    }, 'test');

    expect(JSON.parse(JSON.stringify(obj1))).to.deep.equal({
      id: "0",
      types: ['test'],
      test: 123,
      another: "@1"
    });
    
    expect(JSON.parse(JSON.stringify(obj2))).to.deep.equal({
      id: "1",
      types: ['test'],
      test: 123,
      another: "@0"
    });
  });
});