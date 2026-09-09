/* ===== DevPublish : authentication & account system ===== */
(function () {
  "use strict";

  firebase.initializeApp(__FIREBASE_CONFIG__);
  var auth = firebase.auth();
  auth.tenantId = "__LP_AUTH_TENANT_ID__";
  var db = firebase.firestore();
  var NS = "tenants/__LP_AUTH_TENANT_ID__";

  var PALETTE = ['#4F46E5', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#0EA5E9'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function slugifyUsername(raw) {
    return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
  }

  function initialsFor(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function colorFor(seed) {
    var str = String(seed || '');
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }

  function timeAgo(date) {
    if (!date) return '';
    var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      var n = Math.floor(seconds / units[i][1]);
      if (n >= 1) return n + ' ' + units[i][0] + (n > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }

  function toDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    return null;
  }

  /* ---- profile CRUD (community: public-readable, owner-writable) ---- */

  function profileRef(uid) { return db.doc(NS + '/community/profiles/items/' + uid); }
  function profilesCol() { return db.collection(NS + '/community/profiles/items'); }

  function getProfile(uid) {
    return profileRef(uid).get().then(function (snap) { return snap.exists ? snap.data() : null; });
  }

  function getProfileByUsername(username) {
    return profilesCol().where('usernameLower', '==', String(username || '').toLowerCase()).limit(1).get()
      .then(function (snap) { return snap.empty ? null : snap.docs[0].data(); });
  }

  function isUsernameTaken(username, excludeUid) {
    return profilesCol().where('usernameLower', '==', String(username || '').toLowerCase()).limit(5).get()
      .then(function (snap) {
        return snap.docs.some(function (d) { return d.id !== excludeUid; });
      });
  }

  function createProfile(user, data) {
    return profileRef(user.uid).set({
      ownerUid: user.uid,
      name: data.name,
      username: data.username,
      usernameLower: data.username.toLowerCase(),
      email: data.email,
      bio: '',
      location: '',
      website: '',
      github: '',
      linkedin: '',
      avatarColor: colorFor(user.uid),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function updateProfile(uid, data) {
    var payload = {};
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return profileRef(uid).set(payload, { merge: true });
  }

  function resolveLoginEmail(identifier) {
    var id = String(identifier || '').trim();
    if (id.indexOf('@') !== -1) return Promise.resolve(id);
    return getProfileByUsername(id).then(function (profile) { return profile ? profile.email : null; });
  }

  /* ---- follows (community: any signed-in member creates their own edge) ---- */

  function followDocId(followerUid, followingUid) { return followerUid + '_' + followingUid; }
  function followRef(followerUid, followingUid) { return db.doc(NS + '/community/follows/items/' + followDocId(followerUid, followingUid)); }
  function followsCol() { return db.collection(NS + '/community/follows/items'); }

  function isFollowing(followerUid, followingUid) {
    return followRef(followerUid, followingUid).get().then(function (s) { return s.exists; });
  }

  function followUser(followerUid, target, actorProfile) {
    if (followerUid === target.uid) return Promise.reject(new Error('cannot-follow-self'));
    return followRef(followerUid, target.uid).set({
      ownerUid: followerUid,
      followerUid: followerUid,
      followingUid: target.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      return db.collection(NS + '/members/notifications/items').add({
        recipientUid: target.uid,
        actorUid: followerUid,
        actorName: (actorProfile && actorProfile.name) || 'Someone',
        actorUsername: (actorProfile && actorProfile.username) || '',
        type: 'follow',
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function () { /* notification is a courtesy, never block the follow */ });
    });
  }

  function unfollowUser(followerUid, targetUid) {
    return followRef(followerUid, targetUid).delete();
  }

  function countFollowers(uid) {
    return followsCol().where('followingUid', '==', uid).get().then(function (s) { return s.size; });
  }

  function countFollowing(uid) {
    return followsCol().where('followerUid', '==', uid).get().then(function (s) { return s.size; });
  }

  function listFollowers(uid) {
    return followsCol().where('followingUid', '==', uid).get().then(function (snap) {
      var uids = snap.docs.map(function (d) { return d.data().followerUid; });
      return Promise.all(uids.map(getProfile)).then(function (profiles) { return profiles.filter(Boolean); });
    });
  }

  function listFollowing(uid) {
    return followsCol().where('followerUid', '==', uid).get().then(function (snap) {
      var uids = snap.docs.map(function (d) { return d.data().followingUid; });
      return Promise.all(uids.map(getProfile)).then(function (profiles) { return profiles.filter(Boolean); });
    });
  }

  /* ---- notifications (members: shared among signed-in accounts) ---- */

  function notificationsCol() { return db.collection(NS + '/members/notifications/items'); }

  function listNotifications(uid) {
    return notificationsCol().where('recipientUid', '==', uid).get().then(function (snap) {
      var items = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      items.sort(function (a, b) {
        var ta = toDate(a.createdAt), tb = toDate(b.createdAt);
        return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
      });
      return items;
    });
  }

  function countUnreadNotifications(uid) {
    return notificationsCol().where('recipientUid', '==', uid).where('read', '==', false).get()
      .then(function (s) { return s.size; });
  }

  function markAllNotificationsRead(uid) {
    return notificationsCol().where('recipientUid', '==', uid).where('read', '==', false).get()
      .then(function (snap) {
        var batch = db.batch();
        snap.docs.forEach(function (d) { batch.update(d.ref, { read: true }); });
        return batch.commit();
      });
  }

  /* ---- UI helpers ---- */

  function showAlert(box, message, type) {
    if (!box) return;
    box.hidden = false;
    box.textContent = message;
    box.classList.remove('is-error', 'is-success');
    box.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }
  function hideAlert(box) { if (box) box.hidden = true; }

  function setBtnLoading(btn, label) {
    if (!btn) return;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span>' + esc(label) + '</span>';
  }
  function resetBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }

  /* ---- route guards ---- */

  function requireAuth(cb) {
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        var here = location.pathname.split('/').pop() + location.search;
        location.href = 'login.html?redirect=' + encodeURIComponent(here || 'dashboard.html');
        return;
      }
      cb(user);
    });
  }

  function requireAdmin(cb, onDenied) {
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop());
        return;
      }
      user.getIdTokenResult(true).then(function (r) {
        if (r.claims && r.claims.owner === true) cb(user);
        else if (onDenied) onDenied(user);
      });
    });
  }

  window.dp = {
    auth: auth, db: db, NS: NS,
    esc: esc, isValidEmail: isValidEmail, slugifyUsername: slugifyUsername,
    initialsFor: initialsFor, colorFor: colorFor, timeAgo: timeAgo, toDate: toDate,
    getProfile: getProfile, getProfileByUsername: getProfileByUsername,
    isUsernameTaken: isUsernameTaken, createProfile: createProfile, updateProfile: updateProfile,
    resolveLoginEmail: resolveLoginEmail,
    isFollowing: isFollowing, followUser: followUser, unfollowUser: unfollowUser,
    countFollowers: countFollowers, countFollowing: countFollowing,
    listFollowers: listFollowers, listFollowing: listFollowing,
    listNotifications: listNotifications, countUnreadNotifications: countUnreadNotifications,
    markAllNotificationsRead: markAllNotificationsRead,
    showAlert: showAlert, hideAlert: hideAlert, setBtnLoading: setBtnLoading, resetBtn: resetBtn,
    requireAuth: requireAuth, requireAdmin: requireAdmin,
    currentUser: null
  };

  /* ---- header wiring, runs on every page ---- */

  document.addEventListener('DOMContentLoaded', function () {
    var avatarBtn = document.getElementById('avatarBtn');
    var avatarDropdown = document.getElementById('avatarDropdown');
    var logoutBtn = document.getElementById('logoutBtn');
    var notifBtn = document.getElementById('notifBtn');

    if (avatarBtn && avatarDropdown) {
      avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = avatarDropdown.hidden;
        avatarDropdown.hidden = !open;
        avatarBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!avatarDropdown.hidden && !avatarDropdown.contains(e.target) && e.target !== avatarBtn) {
          avatarDropdown.hidden = true;
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        auth.signOut().then(function () { location.href = 'index.html'; });
      });
    }

    if (notifBtn) {
      notifBtn.addEventListener('click', function () { location.href = 'notifications.html'; });
    }

    document.querySelectorAll('.toggle-pw').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    });
  });

  auth.onAuthStateChanged(function (user) {
    window.dp.currentUser = user;
    var guestEls = document.querySelectorAll('.auth-guest-only');
    var userEls = document.querySelectorAll('.auth-user-only');

    if (user) {
      guestEls.forEach(function (el) { el.hidden = true; });
      userEls.forEach(function (el) { el.hidden = false; });
      document.body.classList.add('is-authed');

      getProfile(user.uid).then(function (profile) {
        var name = (profile && profile.name) || user.email || 'You';
        var circle = document.getElementById('avatarCircle');
        if (circle) {
          circle.textContent = initialsFor(name);
          circle.style.background = (profile && profile.avatarColor) || colorFor(user.uid);
        }
        var link = document.getElementById('dropdownProfileLink');
        if (link && profile && profile.username) link.href = 'profile.html?u=' + encodeURIComponent(profile.username);
      });

      countUnreadNotifications(user.uid).then(function (n) {
        var badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (n > 0) { badge.hidden = false; badge.textContent = n > 9 ? '9+' : String(n); }
        else badge.hidden = true;
      }).catch(function () {});
    } else {
      guestEls.forEach(function (el) { el.hidden = false; });
      userEls.forEach(function (el) { el.hidden = true; });
      document.body.classList.remove('is-authed');
    }

    document.dispatchEvent(new CustomEvent('dp:authchange', { detail: { user: user } }));
  });
})();
