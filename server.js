// 1. 서버를 오픈하기 위한 기본 문법
const express = require('express');
const app = express();

// 2. body-parser 추가하기
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// 3. 몽고디비 설정
const MongoClient = require('mongodb').MongoClient;

// 4. ejs 설정 : 뷰 엔진으로 ejs를 지정
app.set('view engine', 'ejs');


// 5. 폼에서 PUT 요청히 사용할 라이브러리 추가
const methodOverride = require('method-override');
app.use(methodOverride('_method'));


// 6. 세션 관련 라이브러리 추가
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const { deserializeUser } = require('passport');
app.use(session({secret: '비밀코드', resave: true, saveUninitialized: false})); // 비밀코드는 세션을 만들때 비밀코드임.
app.use(passport.initialize()); // app.use()는 미들웨어 -> 미들웨어는 서버와의 요청-응답 중간에 실행되는 코드를 가리킴.
app.use(passport.session());


let db;
MongoClient.connect('mongodb+srv://admin:jully113@cluster0.rjfx6ce.mongodb.net/?retryWrites=true&w=majority', function(error, client) {
  if (error) return console.log(error);

  db = client.db('todoapp'); // todoapp라는 데이터 베이스 저장

  // db.collection('post').insertOne({ _id : 1, 이름 : 'yun', 나이 : 25 }, function(error, result) {
  //   console.log('저장완료');
  // });

  app.listen(8080, function() { // listen(포트, 실행할 코드)
    console.log('listening 8080');
  });
})



// 서버로 get 요청 - index.html
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');  // sendFile() 함수 사용해 파일 보내기, __dirname : 현재 파일의 경로
});

// 서버로 get 요청 - write.html
app.get('/write', function(req, res) {
  res.sendFile(__dirname + '/write.html');
});



// 할일 post 요청하기
app.post('/add', function(req, res) { // ★1번 : /add로 post 요청하면,
  res.send('전송완료');
  // console.log(req.body.title); // body-parser 추가해 전달한 데이터를 서버의 콘솔에 출력
  // console.log(req.body.date);  // 서버로 input에 입력한 데이터가 전달됨.

  // 1) counter 설정하기
  db.collection('counter').findOne({name: '게시물갯수'}, function(error, result) { // ★2번 : counter라는 콜렉션에서 총게시물갯수 저장해놓은 문자를 찾음. 찾은 문서는 result변수에 담겨옴.
    console.log(result.totalPost); // ★3번: 게시물갯수 확인
    let totalPostingCount = result.totalPost; // 0

    // 2) 게시물의 id 1증가하기 반영 
    db.collection('post').insertOne({ _id : totalPostingCount + 1, 제목 : req.body.title, 날짜 : req.body.date }, function(error, result) { // ★ post  콜렉션에  insertOne() 함수로 게시물 추가, _id를 totalPostingCount 값을 이용해 부여해 줌.
      console.log('저장완료');

      // 3) 게시물을 올린 후 totalPost값 1증가하기
      db.collection('counter').updateOne({name: '게시물갯수'}, {$inc : { totalPost : 1}}, function(error, result) {
        if (error) {  return console.log(error) };
      });
    });
  });
});


// list 요청 : DB 데이터 가져오는 요청
app.get('/list', function(req, res) {
  db.collection('post').find().toArray(function(error, result) {
    console.log(result);
    res.render('list.ejs', { postdata : result }); // list.ejs파일을 렌더링함과 동시에 { postdata : result } 데이터를 보내줌.
  });
});


// 삭제 요청
app.delete('/delete', function(req, res) {
  console.log(req.body); // delete 요청을 할 때 보낸 데이터 출력하기
  req.body._id = parseInt(req.body._id);
  // db의 글 삭제하기
  db.collection('post').deleteOne(req.body, function(error, result) {
    console.log('삭제완료');
  });
  res.send('삭제완료!');
});


// /detail/id로 접속하면 detail.ejs 보여주기
app.get('/detail/:id', function(req, res) {
  db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, result) {
    console.log(result);
    if (!result) { return res.send('URL이 잘못되었어요!') }
    res.render('detail.ejs', {postdata : result}); // 요청에 따라 찾은 결과를 postdata라는 이름으로 ejs파일로 보냄.
  });
});


// ******* 게시물 목록의 수정을 위한 작업 *******
// /edit/id로 접속하면 edit.ejs 보여주기
app.get('/edit/:id', function(req, res) {
  db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(error, result) {
    console.log(result);
    if (!result) { return res.send('URL이 잘못되었어요!') }
    res.render('edit.ejs', {postdata : result}); // 요청에 따라 찾은 결과를 postdata라는 이름으로 ejs파일로 보냄.
  });
});

// PUT 요청이 들어오면 게시물 수정하기
app.put('/edit', function(req, res) {
  // 폼에서 전송한 제목, 날짜로 업데이트 -> {제목 : req.body.title, 날짜 : req.body.date}
  db.collection('post').updateOne({ _id : parseInt(req.body.id) }, { $set : {제목 : req.body.title, 날짜 : req.body.date}},  function(error, result) {
    console.log('수정완료!');
    res.redirect('/list');
  });
});




// ******* 로그인 기능 구현  *******
// 1) 로그인 페이지 접속하면 띄워주기
app.get('/login', function(req, res) {
  res.render('login.ejs');
});

// 2) 로그인하면 아이디, 비번 검사하기
app.post('/login', passport.authenticate('local', {failureRedirect: '/fail'}) ,function(req, res) { // passport.authenticate('local',...) local 방식으로 아이디, 비번 인증
  res.redirect('/'); // 회원인증 성공시 이동
});

// 3) 인증방식 : 아이디, 비번 검증
passport.use(new LocalStrategy({
  usernameField: 'id', // 폼에 입력한 아이디, 비번
  passwordField: 'pw',
  session: true,
  passReqToCallback: false
}, function (입력한아이디, 입력한비번, done) { // 아이디, 비번 검사 코드가 함수에 들어감.
  console.log(입력한아이디, 입력한비번);

  db.collection('login').findOne({id : 입력한아이디}, function(error, result) {
    if (error) { return done(error) }

    if (!result) { return done(null, false, { message: '존재하지 않은 아이디입니다.' }) } // 일치하는 아이디 없을 경우

    if (입력한비번 == result.pw) {
      return done(null, result) // done(서버에러, 성공시 사용자 db 데이터, 에러메세지)
    } else {
      return done(null, false, { message: '비번이 틀렸어요.' })
    }
  })
}));

// 4) 인증 성공시 세션 만들기
passport.serializeUser(function(user, done) { // 아이디, 비번 검증 성공시 result에 들어가 있는 사용자 정보가 user 파라미터에 들어감!
  done(null, user.id) 
});

passport.deserializeUser(function(아이디, done) { 
  // 6) 로그인한 유저의 세션 아이디를 개인정보(login 콜렉션에 있음) DB에서 찾기
  db.collection('login').findOne({id: 아이디}, function(error, result) {
    done(null, result)
  });
});


// 5) 로그인한 유저만 접속할 수 있는 기능 -> 마이페이지 요청
app.get('/mypage', loginFn, function(req,  res) {
  console.log(req.user); // 로그인한 유저의 정보 보여주기
  res.render('mypage.ejs', {사용자: req.user}) // 로그인 성공시 보여줌.
});

// 로그인 체크 함수
function loginFn(req, res, next) { // 미들웨어 만들기
  if (req.user) { // 로그인 후 세션이 있으면 req.user가 있음, 세션이 있으면 통과(next())!
    next()
  } else {
    res.send('로그인 불가!')
  }
}




// ******* 검색 기능 구현 *******
app.get('/search', function(req, res) {
  console.log(req.query);
  db.collection('post').find({$text: {$search : req.query.value}}).toArray((error, result) => {
    console.log(result);
    res.render('search.ejs', {postdata : result});
  })
})



