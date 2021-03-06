require('dotenv').config();
var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var path = require("path");

// Parses our HTML and helps us find elements
var cheerio = require("cheerio");
// Makes HTTP request for HTML page
var axios = require("axios");

//Require models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

//port and express : .env파일에서 포트라는 베리어블을 가지고 있는 파일이 있으면 그걸 쓰고 없으면 3000번을 쓰라는 뜻. 
var PORT = process.env.PORT || 3000;
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));

//Set up handlevar view
app.engine("handlebars", exphbs({ defaultLayout: "main", partialsDir: path.join(__dirname, "/views")}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
//process.env.MONGO_URL || 
var mongodb_url = process.env.MONGO_URL || "mongodb://localhost:27017/local";
mongoose.connect( mongodb_url, { useNewUrlParser: true });
var db = mongoose.connection;

//test mongooes
db.on("error", function(err){
  console.log("mongoose err: " + err);
});

db.once("open", function(){
  console.log("Mongoose connection successful.");
});

//get handlebar page
app.get("/", function(req,res){
  Article.find({"saved": false}, function(err, data){
    var mdObject = {
      article: data.map(d=>{return {summary : d.summary, 
                                    title : d.title,
                                    link : d.link,
                                    image: d.image,
                                    _id: d._id      
      }})
    };//맵을 사용해서 핸들바에 데이터 베이스에서 나오는 데이터를 바로 가져오면 보안문제가 있어서 원하는 변수만 가져와서 보여줄 수 있도록 함. 
    // console.log(mdObject);
    res.render("home", mdObject);
  });
});

app.get("/saved", function(req, res){
  Article.find({"saved": true}).populate("note").exec(function(err, articles){
    var mdObject = {
      article: articles.map(d=>{
        console.log("d.note"+d.note);
        return {summary : d.summary, 
                title : d.title,
                link : d.link,
                image: d.image,
                _id: d._id,
                notes: d.note.map(x => {return {_id: x._id, body: x.body, article: x.article}})   
      }})
    };
    console.log('print out saved');
    for(var i=0; i<mdObject.article.length; i++){
      console.log("article title" + mdObject.article[i].title);
      console.log("note mdObject" + mdObject.article[i].notes); 
    }
    res.render("saved", mdObject);
  });
});

app.get("/scrape", function(req, res){
  var linkUrl = "https://www.medicalnewstoday.com"
  // Making a request via axios for reddit's "webdev" board. The page's HTML is passed as the callback's third argument
  axios.get(linkUrl).then(function(response) {

  // Load the HTML into cheerio and save it to a variable
  // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
  var $ = cheerio.load(response.data);

  // With cheerio, find each p-tag with the "title" class
  // (i: iterator. element: the current element)
    var count = 0;
    const limit = 20;
    const articlePromises = [];

    $("li.css-1ib8oek").each(function(i, element) {
      if (count >= limit) {
        console.log("halting, count is " + count);
        return false;
      }
    // Save the text of the element in a "title" variable
    var title = $(element).find("a.css-ni2lnp").text();

    // In the currently selected element, look at its child elements (i.e., its a-tags),
    // then save the values for any "href" attributes that the child elements may have
    var link = linkUrl + $(element).find("a.css-ni2lnp").attr("href");
    var newId = ($(element).find("a.css-ni2lnp").attr("href")).replace(/\//g, "_" );
    //앞에있는 url의 모든 /를 _로 바꿔줌. 
    var summary = $(element).find("a.css-2fdibo").text();

    var image = $(element).find("lazy-image").attr("src");
    var realImage = image?"http://" + image.split("?")[0].substr(2):undefined;

    // Save these results in an object that we'll push into the results array we defined earlier
    if(title){
      count++;
      console.log(count);
      var result = {_id: newId, title: title, link: link, summary: summary, image: realImage};
      //url escaping할 때 encodeuriincomponent 사용
      const articlePromise = Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
        articlePromises.push(articlePromise);
        // Log the results once you've looped through each of the elements found with cheerio
        console.log(result);
      }
  });
  Promise.all(articlePromises).then(() => {
      res.send(200);
    })
  });
});

app.get("/articles", function(req, res){
  Article.find({}, function(err, data){
    if(err){
      console.log("article err: ", err);
    }else{
      res.json(data);
    }
  });
});

//article id
app.get("/articles/:id", function(req, res){
  Article.findOne({"_id": encodeURIComponent(req.params.id)}).populate("note").exec(function(err, data){
    if(err){
      console.log(err);
    }else{
      res.json(data);
    }
  });
});

//save article
app.post("/articles/save/:id", function(req, res){
  console.log(req.params.id);
  Article.findOneAndUpdate({"_id": encodeURIComponent(req.params.id)}, {"saved": true})
  //article.<-뒤는 데이터 베이스 정보가 온다. 
  .exec(function(err,data){
    if(err)throw err;
    console.log(data);
    res.send(data);
  });
});

//delete article
app.post("/articles/delete/:id", function(req, res){
  Article.findOneAndRemove({"_id": encodeURIComponent(req.params.id)}, {"saved":false, "note":[]})
  .exec(function(err, data){
    if(err) throw err;
    res.send(data);
  });
});

//create note
app.post("/note/saved/:id", function(req, res){
  var newNote = new Note({
    body: req.body.text,
    article: req.params.id
  });
   console.log("new note" + newNote);
  newNote.save(function(err,note){
    if(err){
      console.log("note save err: ", err);
    }else{
      Article.findByIdAndUpdate({"_id": req.params.id}, {$push: {"note":newNote}})
      .exec(function(err){
        if(err)throw err;
        res.send(newNote);
      });
    }
  });
});

//delete note

app.delete("/delete_all", async (req, res) => {
  try {
    // delete all the notes
    await Note.deleteMany({}).exec();
    // delete all the scraped articles
    await Article.deleteMany({}).exec();
    res.send("successfully deleted all articles and notes")
  } catch (err) {
    res.json(err);
  }
});

app.delete("/note/delete/:note_id/:article_id", function(req, res){
  Note.findByIdAndRemove(req.params.note_id, function(err){
    if(err){
      console.log(err);
      res.send(err);
    }else{
      Article.findOneAndUpdate({"_id": req.params.article_id}, {$pull: {"note": req.params.note_id}})
      .exec(function(err){
        if(err) throw err;
        res.send("Note Deleted");
      });
    }
  });
});

// app.delete("/note/delete/:note_id/:article_id", function(req, res){
  
//       Article.findAndModify({"_id": req.params.article_id}, {$pull: {"note": req.params.note_id}})
//       .exec(function(err){
//         res.send("Note Deleted");
//         if(err){
//           console.log(err);
//           res.send(err);
//         }else{
//           Note.findByIdAndRemove(req.params.note_id, function(err){
//             if(err){
//               console.log(err);
//               res.send(err); 
//         }
//       })
//     }
//   }
// )
// });

//Listen port
app.listen(PORT, function(){
  console.log("Listening on port: " + PORT);
});