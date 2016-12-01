'use strict';

$(function() {

  var $content = $("#content");
  var state = mkState();

  common.get('token', {}, function(result) {
    state.update('token', result.token);
  });

  function renderStartView() {
    $content.html(view.div({id: 'start_section'}).append(
      view.div().html(view.mkLogInDiv(function(result) {
        state.update('token', result.token);
      })),
      view.div().html(view.mkSignUpDiv(function(result) {
        state.update('token', result.token);
      }))
    ));
  }

  function renderHomeView(user) {
    $content.html(
      view.mkFrame(
        user.username,
        function() {
          var $p = common.post('/logout');
          $p.then(function() {
            state.update('token', null);
          });
        },
        view.div().append(

          view.div({id: 'followees_heading', class: 'heading'}).text("Followees"),
          view.div({id: 'followees_list'}).html((function() {
            return _.map(user.followees, function(id) {
              return view.div().append(
                view.navlink({class: 'followee', text: id, href: '/profile/' + id}), 
                view.button({class: 'followee_unfollow_button', text: 'Unfollow'}).click(function() {
                  var token = state.get('token');
                  common.authPost(token)('/unfollow', {followee: id}).then(function() {
                    common.authGet(token)('/user', {}).then(function(result) {
                      state.update('user', result.user);
                    });
                  });
                }) 
              )
            });
          }())),

          view.div({id: 'pending_followees_heading', class: 'heading'}).text("Pending Followees"),
          view.div({id: 'pending_followers_list'}).html((function() {
            return _.map(user.pendingFollowees, function(id) {

              return view.div().append(
                view.navlink({class: 'pending_followee', text: id, href: '/profile/' + id}), 
                view.button({class: 'pending_followee_cancel_button', text: 'Cancel'}).click(function() {
                  var token = state.get('token');
                  common.authPost(token)('/unfollow', {followee: id}).then(function() {
                    common.authGet(token)('/user', {}).then(function(result) {
                      state.update('user', result.user);
                    });
                  });
                }) 
              )

            });
          }())),

          view.div({id: 'followers_heading', class: 'heading'}).text("Followers"),
          view.div({id: 'followers_list'}).html((function() {
            return _.map(user.followers, function(id) {
              return view.div().append(
                view.navlink({class: 'follower', text: id, href: '/profile/' + id}), 
                view.button({class: 'follower_unfollow_button', text: 'Remove'}).click(function() {

                  var token = state.get('token');
                  common.authPost(token)('/removeFollower', {follower: id}).then(function() {
                    common.authGet(token)('/user', {}).then(function(result) {
                      state.update('user', result.user);
                    });
                  });

                }) 
              )
            });
          }())),

          view.div({id: 'pending_followers_heading', class: 'heading'}).text("Pending Followers"),
          view.div({id: 'pending_followers_list'}).html((function() {
            return _.map(user.pendingFollowers, function(id) {
              return view.div().append(
                view.navlink({class: 'pending_follower', text: id, href: '/profile/' + id}), 
                view.button({class: 'pending_follower_accept_button', text: 'Accept'}).click(function() {

                  var token = state.get('token');
                  common.authPost(token)('/acceptFollower', {follower: id}).then(function() {
                    common.authGet(token)('/user', {}).then(function(result) {
                      state.update('user', result.user);
                    });
                  });

                }) 
              )
            });
          }()))

        )
      )
    );
  }

  //handle all state changes
  state.addHandler('index', {
    token: function(token) {
      $content.empty();
      if (token) {
        var $p = common.authGet(token)('user', {});
        $p.then(function(result) {
          state.update('user', result.user);
        });
      } else {
        renderStartView();
      }
    },

    user: function(user) {
      if (user) {
        renderHomeView(user);
      }
    }
  });


});
