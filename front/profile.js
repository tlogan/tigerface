$(function() {

  var $content = $("#content");
  var state = mkState();


  common.get('/token', {}, function(result) {
    state.update('token', result.token);
  });

  function render(user, profile) {
    var token = state.get('token');
    $content.html(
      view.mkFrame(
        user && user.username,
        function() {
          common.post('/logout').then(function() {
            window.location = "/";
          });
        },
        profile ? view.div().append(
          view.div().append(
            profile.user.picture ? view.img({src: profile.user.picture + '?' + (new Date()).getTime()}) : null,
            (profile.user.username == user.username) ? view.uploadButton({id: 'edit_pic_button', text: 'Edit picture'}, function(file) {
              common.sendFile(token)('/picture', file).then(function() {
                common.authGet(token)('/profile', {username: profile.user.username}).then(function(result) {
                  state.update('profile', result.profile);
                });
              });
            }) : null,
            (profile.user.username == user.username && profile.user.picture) ? view.button({id: 'delete_pic_button', text: 'Delete picture'}).click(function() {
                common.authPost(token)('/deletepic', {}).then(function() {
                  common.authGet(token)('/profile', {username: profile.user.username}).then(function(result) {
                    state.update('profile', result.profile);
                  });
                });
            }) : null
          ),
          view.div().append(
            view.div({id: 'profile_full_name', text: profile.user.fullName}),

            (profile.user.username != user.username) ? (function() {
              var followStatus = profile.followStatus; 
              var buttonText = followStatus == 'pending' ? 'Cancel follow' : followStatus == 'active' ? 'Unfollow' : 'Follow';
              var url = followStatus == 'pending' ? '/unfollow' : followStatus == 'active' ? '/unfollow' : '/follow'; 
              return view.button({text: buttonText}).click(function() {
                var token = state.get('token');
                common.authPost(token)(url, {followee: profile.user.username}).then(function() {
                  common.authGet(token)('/profile', {username: profile.user.username}).then(function(result) {
                    state.update('profile', result.profile);
                  });
                });
              })
            }()) : null
          ),
          view.div().append(
            (user.username == profile.user.username || profile.followStatus == 'active') ? view.mkNoteEditor(function(textBody) {
              common.authPost(token)('/note', {profileId: profile.user.username, textBody: textBody}).then(function() {
                common.authGet(token)('/profile', {username: profile.user.username}).then(function(result) {
                  state.update('profile', result.profile);
                });
              });
            }) : null
          ),
          view.div().append((function() {
            return _.map(profile.notes, function(note) {
              return view.mkNoteView(note);
            })
          }()))
        ) : null 
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
       console.log(JSON.stringify(state.get('profile')));
      if (state.get('profile')) { //ready to render when both user and profile have been retrieved
        render(user, state.get('profile'));
      }
    },

    profile: function(profile) {
      if (!profile) {
        window.location = '/';
      } 
      if (profile && state.has('user')) { //ready to render when both user and profile have been retrieved
        render(state.get('user'), profile);
      }
    }

  });


});
