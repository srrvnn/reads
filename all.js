var Router = window.ReactRouter.Router;
var Route = window.ReactRouter.Route;
var Link = window.ReactRouter.Link;
var browserHistory = window.ReactRouter.browserHistory;

var Reads = React.createClass({
    getInitialState: function() {
        return {loading: false, user_name: null};
    },
    componentWillMount: function() {
        var _this = this;
        var query = this.props.location.query;
        if (store.get('user_access_token') && store.get('user_access_secret') && store.get('user_name')) {
            _this.setState({user_name: store.get('user_name')});
        } else if (query.oauth_token && query.oauth_verifier) {
            _this.setState({loading: true});
            $.getJSON('http://localhost:5000/twitter_signin_callback', {
                oauth_token: query.oauth_token,
                oauth_verifier: query.oauth_verifier}, function(data) {
                    store.set('user_access_token', data.user_token);
                    store.set('user_access_secret', data.user_secret);
                    store.set('user_name', data.user_name);

                    _this.setState({loading: false, user_name: store.get('user_name')});
            });
        }
    },
    render: function() {
        return (
            <div className="content">
                <h1>Reads, from your Twitter.</h1>
                {this.state.user_name === null
                    ? <ReadsIntro />
                    : <ReadsList onSignOut={this.onSignOut}/>}
            </div>
        );
    }
});

var ReadsIntro = React.createClass({
    render: function() {
        return (
            <div className="reads-intro reads-intro">
                Add Twitterati, and filter the links they tweet about. <br/>

                <span className="more">
                    <ul>
                        <li> Search from your friends, to all public profiles. </li>
                        <li> Keep a private twitter list of 'reads', and filter links. </li>
                        <li> Add custom filters to keep certain links coming. </li>
                        <li> Soon: Like, and retweet your favorite reads. </li>
                    </ul>
                </span>

                <a href="http://localhost:5000/twitter_signin"><img className="twitter-signin" src="img/twitter_signin.png" /></a>

            </div>
        )
    }
});

var ReadsList = React.createClass({
    searchTimeout: null,
    getInitialState: function() {
        return {loading: true, searching: true, user_name: store.get('user_name'), search: null, list: [], searchList: []};
    },
    componentWillMount: function () {
        if (this.state.user_name) {
            this.getTweets();
        } else {
            this.props.onSignOut();
        }
    },
    componentDidMount: function() {

    },
    getTweets: function() {
        var _this = this;
        $.getJSON('http://localhost:5000/twitter_list_timeline', {
            user_access_token: store.get('user_access_token'),
            user_access_secret: store.get('user_access_secret'),
            since_id: store.get('timeline_since_id'),
            user_name: this.state.user_name}, function(data) {

                _this.setState({loading: false, list: JSON.parse(data)});
        });
    },
    onSearchChange: function(e) {
        var _this = this;
        _this.setState({search: e.target.value || ''});
        clearTimeout(_this.searchTimeout);
        _this.searchTimeout = setTimeout(function() {
            _this.setState({searching: true});
            _this.setState({searchList: []});
            if (_this.state.search.length < 1) return;
            $.getJSON('http://localhost:5000/twitter_search_people', {
                user_access_token: store.get('user_access_token'),
                user_access_secret: store.get('user_access_secret'),
                q: _this.state.search}, function(data) {

                var searchResults = JSON.parse(data);
                console.dir(searchResults);

                var searchItems = searchResults && searchResults.map(function(item) {
                    return {
                        type: 'people',
                        key: item.id_str,
                        content: item.name,
                        date: item.created_at,
                        statuses_count: item.statuses_count,
                        following: item.following,
                        followers_count: item.followers_count,
                        friends_count: item.friends_count,
                        profile_image_url: item.profile_image_url
                    }
                });

                _this.setState({searchList: searchItems});
            });
        }, 300);
    },
    render: function() {
        var reads_items = this.state.searchList && this.state.searchList.map(function(item) {
            return (
                <ReadsItem key={item.key} item={item} />
            )
        });
        return (
            <div className="reads-list">
                <input ref="reads-search" onChange={this.onSearchChange} value={this.state.search} />
                {reads_items}
            </div>
        );
    }
});

var ReadsItem = React.createClass({
    render: function() {
        return (
            <div className="reads-item">
                {this.props.item.content}
            </div>
        )
    }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route path="/" component={Reads}/>
  </Router>
), document.getElementById('container'))
