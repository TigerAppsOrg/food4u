# cos333_project

When in project directory of the terminal, type "flask run" to run


To get database, run these three commands in the terminal:
"flask db init"
then
"flask db migrate -m [insert message]"
then
"flask db upgrade" to change the database

To delete database and init again, delete both the migrations folder and app.db of project directory and run the three commands above again in the terminal.


Note to Ben: type "export FLASK_APP=food4u.py" and then "flask shell" to
test database queries