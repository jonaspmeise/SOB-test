import { expect } from "chai";
import { GameEngine } from "../client/scripts/engine/engine.js";
import { Component } from "../client/scripts/engine/types-engine.js";

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
    const myObj: {sides: number, value: number} = engine.registerComponent({
      sides: 6,
      value: (_engine, self) => self.sides
    }, 'die');

    expect(engine.components).length(1);

    expect(myObj.sides).equals(6);
    expect(myObj.value).equals(6);
    expect(myObj.value).equals(6);
    expect(myObj.value).equals(6);
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
      $values: (engine) => engine.query('test')
    }, 'query-test') as {$values: {test: number}[]};

    expect(Array.isArray(query.$values)).to.be.true;
    expect(query.$values).to.be.length(3);

    expect(query.$values.filter(v => v.test === 123)).to.have.length(1);
    expect(query.$values.filter(v => v.test === 234)).to.have.length(1);
    expect(query.$values.filter(v => v.test === 345)).to.have.length(1);
  });

  
  it('If a component features a query attribute, its cached value is updated on access, if a change happened since then.', () => {
    // Registered, but no targets exist yet!
    const query = engine.registerComponent({
      values: (engine) => engine.query('test')
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
      greeting: (engine, self) => `Hello ${self.name}!`
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
      test2: (engine, self) => self.test - 111
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
      test2: (engine, self) => self.test - 111
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
});