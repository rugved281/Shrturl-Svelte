<script>
    import {page} from '$app/stores';
    var code = $page.params.code;
    code = code.toLowerCase()
    // firebase
    import {firebase} from '@firebase/app';
    import '@firebase/database';
    // Your web app's Firebase configuration
    const API_KEY =
      import.meta.env.API_KEY;
    const PROJECT_ID =
      import.meta.env.PROJECT_ID;
    const APP_ID =
      import.meta.env.APP_ID;
    const AUTH_DOMAIN =
      import.meta.env.AUTH_DOMAIN;
    const STORAGE =
      import.meta.env.STORAGE;
    const MESSAGE_ID =
      import.meta.env.MESSAGE_ID;
    const DB_URL =
      import.meta.env.DB_URL;
    var firebaseConfig = {
      apiKey: API_KEY,
      authDomain: AUTH_DOMAIN,
      databaseURL: "https://shrturl-1b151-default-rtdb.firebaseio.com",
      projectId: PROJECT_ID,
      storageBucket: STORAGE,
      messagingSenderId: MESSAGE_ID,
      appId: APP_ID,
    };
    // Initialize Firebase
    if(!firebase.apps.length) {
      firebase.default.initializeApp(firebaseConfig)
    } else {
      firebase.app(); // if already initialized, use that one
    }


       firebase.database().ref('/urls/' + code).once('value').then(snapshot => {
        if(snapshot.exists()) {
          if(!snapshot.val().startsWith("http")){
            window.location.href = "//" + snapshot.val();
          } else{
            window.location.href = snapshot.val();
            }

        } else {
          window.location.href = "https://shrturl.tk";
        }
      })
</script>

<h1 class="mb-5 text-5xl font-bold">Redirecting... Please Wait</h1>
<a href="/" id="tst">
    <h2 href="{code}">
        You Can Also Click On Me For Faster Redirect (Not Recomended!)
    </h2>
</a>
<p>If Any Error Please Contact On Github, @ArnavK-09</p>
