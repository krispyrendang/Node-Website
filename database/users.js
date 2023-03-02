const database = include('databaseConnection');

async function createUser(postData) {
	let createUserSQL = `
		INSERT INTO user
		(username, email, hashedPassword, user_type_id)
		VALUES
		(:user, :email, :hashedPassword, 1);
	`;

	let params = {
		user: postData.username,
		email: postData.email,
		hashedPassword: postData.hashedPassword
	}

	try {
		const results = await database.query(createUserSQL, params);

		console.log("Successfully created user");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error inserting user");
		console.log(err);
		return false;
	}
}

async function addToDo(postData) {
	let addToDoSQL = `
		INSERT INTO todo
		(description, user_id)
		VALUES
		(:description, :user_id);
	`;

	let params = {
		user_id: postData.user_id,
		description: postData.todo,
	}

	try {
		const results = await database.query(addToDoSQL, params);

		console.log("Successfully added todo item");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error inserting todo item");
		console.log(err);
		return false;
	}
}

async function getUsers(postData) {
	let getUsersSQL = `
		SELECT user_id, username, user_type
		FROM user
		JOIN user_type USING (user_type_id);
	`;

	try {
		const results = await database.query(getUsersSQL);

		console.log("Successfully retrieved users");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting users");
		console.log(err);
		return false;
	}
}

async function getUser(postData) {
	let getUserSQL = `
		SELECT user_id, username, email, hashedPassword, user_type_id, user_type
		FROM user
		JOIN user_type USING (user_type_id)
		WHERE email = :email;
	`;

	let params = {
		email: postData.email
	}

	try {
		const results = await database.query(getUserSQL, params);

		console.log("Successfully found user");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error trying to find user");
		console.log(err);
		return false;
	}
}

async function getToDoList(postData) {
	let getToDoListSQL = `
	SELECT description, username, user_id
	FROM user
	JOIN user_type USING (user_type_id)
	JOIN todo Using (user_id)
		WHERE user_id = :user_id;
	`;

	let params = {
		user_id: postData.user_id
	}

	try {
		const results = await database.query(getToDoListSQL, params);

		console.log("Successfully found to-do items");
		console.log("results size: " + results[0].length);
		console.log(results[0]);

		if (results[0].length == 0) {
			return false;
		} else {
			return results[0];
		}

	} catch (err) {
		console.log("Error trying to find to-do items");
		console.log(err);
		return false;
	}
}

module.exports = {
	createUser,
	getUsers,
	getUser,
	getToDoList,
	addToDo
};