import './App.css';
import React from 'react';

class ListItem extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <div>
        {this.props.children}
      </div>
    )
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {listItems: []};
  }

  async componentDidMount() {
    debugger
    this.setState({ listItems: [4,5,6] });
  }

  render() {
    const listItems = this.state.listItems.map((item, idx) =>
      <ListItem />
    );

    return (
      <div className="App">
        <div className="App-body">
          {listItems}
        </div>
      </div>
    );
  }
}

export default App;
