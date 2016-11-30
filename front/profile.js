$(function() {

  var $content = $("#content");
  var state = mkState();


  common.get('/token', {}, function(result) {
    state.update('token', result.token);
  });

  function render(user, profile) {
    $content.empty().append(
      view.mkFrame(
        user && user.username,
        function() {
          var $p = common.post('/logout');
          $p.then(function() {
            state.update('token', null);
          });
        },
        profile ? view.div().text("Profile: " + JSON.stringify(profile)) : null
      )
    );
  }

  //handle all state changes
  state.addHandler('profile', {

    token: function(token) {
      $content.empty();
      var profileUsername = window.location.pathname.substring("/profile/".length);
      var $p = common.authGet(token)('/profile', {username: profileUsername});
      $p.then(function(result) {
        state.update('profile', result.profile);
      });

      if (token) {
        var $p = common.authGet(token)('/user', {});
        $p.then(function(result) {
          state.update('user', result.user);
        });
      } else {
        state.update('user', null);
      }
    },

    user: function(user) {
      if (state.has('profile')) { //ready to render when both user and profile have been retrieved
        render(user, state.get('profile'));
      }
    },

    profile: function(profile) {
      if (state.has('user')) { //ready to render when both user and profile have been retrieved
        render(state.get('user'), profile);
      }
    }

  });


});
