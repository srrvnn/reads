var Router = window.ReactRouter.Router;
var Route = window.ReactRouter.Route;
var Link = window.ReactRouter.Link;
var browserHistory = window.ReactRouter.browserHistory;

var Reads = React.createClass({
    getInitialState: function() {
        return { user_name: null, reads_list: null};
    },
    userStatusChange: function() {
        var _this = this;
        $.getJSON('http://localhost:5000/twitter_list_timeline', {
            user_access_token: store.get('user_access_token'),
            user_access_secret: store.get('user_access_secret'),
            since_id: store.get('timeline_since_id'),
            user_name: this.state.user_name || store.get('user_name')}, function(data) {
                console.log(data);
        });
    },
    componentWillMount: function() {
        var _this = this;
        var query = this.props.location.query;
        if (store.get('user_access_token') && store.get('user_access_secret') && store.get('user_name')) {
            _this.setState({user_name: store.get('user_name')});
            _this.userStatusChange();
        } else if (query.oauth_token && query.oauth_verifier) {
            $.getJSON('http://localhost:5000/twitter_signin_callback', {
                oauth_token: query.oauth_token,
                oauth_verifier: query.oauth_verifier}, function(data) {

                    store.set('user_access_token', data.user_token);
                    store.set('user_access_secret', data.user_secret);
                    store.set('user_name', data.user_name);

                    _this.setState({user_name: store.get('user_name')});
                    _this.userStatusChange();
            });
        }
    },
    render: function() {
        return (
            <div className="content">
                <h1>Reads, from your Twitter.</h1>

                {this.state.user_name === null
                    ? <ReadsIntro />
                    : <ReadsList />}
            </div>
        );
    }
});

var ReadsIntro = React.createClass({
    render: function() {
        return (
            <div className="diaries-intro reads-intro">
                Add Twitterati, and filter the links they tweet about. <br/>

                <span className="more">
                    <ul>
                        <li> Search from your friends, to all public profiles. </li>
                        <li> Filter external links, and keep a list of 'reads'. </li>
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
    saveTimeout: null,
    getInitialState: function() {
        return {content: null, created_at: null, updated_at: null};
    },
    onChange: function(e) {
        var _this = this;
        this.setState({content: e.target.value});

        // debounce, and save to local storage
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(function() {
            if (_this.state.content == null || _this.state.content.length < 1) {
                return;
            }
            if (store.enabled) {
                var diaries_posts = store.get('diaries_posts') || [];
                if (diaries_posts.length > 0
                    && diaries_posts[diaries_posts.length - 1].posted == false) {
                    diaries_posts.pop();
                }
                diaries_posts.push({
                    created_at: _this.state.created_at,
                    content: CryptoJS.AES.encrypt(_this.state.content, _this.props.user_id).toString(),
                    posted: false
                });
                store.set('diaries_posts', diaries_posts);
            }
        }, 1000);
    },
    onSubmit: function(e) {
        var _this = this;
        e.preventDefault();
        var post_message = {
            'message': this.state.content
        };

        var first_line = post_message.message.split('\n')[0].replace('...', '');
        var date = Date.parse(first_line);

        post_message.message = isNaN(date)
            ? post_message.message
            : post_message.message.split('\n').slice(1).join('\n');

        FB.api('/me/feed', 'POST', post_message, function (response) {
            if (store.enabled) {
                var diaries_posts = store.get('diaries_posts');
                diaries_posts[diaries_posts.length - 1].posted = true;
                store.set('diaries_posts', diaries_posts);
            }
            if (response && !response.error) {
                _this.props.onStatusChange({message: 'successful', id: response.id});
            } else {
                _this.props.onStatusChange({message: 'unsuccessful'});
            }
        });
    },
    onClear: function() {
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        this.setState({content: (new Date()).toLocaleString('en-US', options) + '...\n', created_at: Date.now()});
        if (store.enabled) {
            var diaries_posts = store.get('diaries_posts') || [];
            if (diaries_posts.length > 0
                && diaries_posts[diaries_posts.length - 1].posted == false) {
                diaries_posts.pop();
            }
            store.set('diaries_posts', diaries_posts);
            this.refs.post_textarea.focus();
        }
    },
    componentDidMount: function() {
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

        if (store.enabled && store.get('diaries_posts') && store.get('diaries_posts').length > 0) {
            var saved = store.get('diaries_posts').sort(function(a, b){ return b.created_at - a.created_at; }).pop();
            if (saved && saved.posted) {
                this.setState({content: (new Date()).toLocaleString('en-US', options) + '...\n', created_at: Date.now()});
            } else if (saved) {
                this.setState({content: CryptoJS.AES.decrypt(saved.content, this.props.user_id).toString(CryptoJS.enc.Utf8), created_at: saved.created_at});
            }
        } else {
            this.setState({content: (new Date()).toLocaleString('en-US', options) + '...\n', created_at: Date.now()});
        }

        this.refs.post_textarea.focus();
    },
    render: function() {
        return (
            <form className="diaries-post" onSubmit={this.onSubmit}>
                <textarea ref="post_textarea" onChange={this.onChange} value={this.state.content}></textarea>
                <div className="actions">
                    <button className="post" type="submit">Post</button>
                    <button className="post" type="button" onClick={this.onClear}>x</button>
                </div>
            </form>
        );
    }
});

var ReadsItem = React.createClass({
    render: function() {
        return (
            <div className="diaries-status">
                {this.props.status ? <span> The private post was {this.props.status}. </span> : ''}
                {this.props.id ? <a href={'http://facebook.com/' + this.props.id} target="_blank"> See it on Facebook. </a> : ''}
            </div>
        )
    }
});

ReactDOM.render((
  <Router history={browserHistory}>
    <Route path="/" component={Reads}/>
  </Router>
), document.getElementById('container'))
