const request = require('supertest');
const app = require('../../app');

describe('User API', () => {
  let accessToken = null;
  it('should acquire access token', async () => {
    accessToken = (await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testUser1',
        password: 'F8hTOnzbXRv',
      })
      .expect(200)).body.accessToken;
  });

  describe('POST /api/users', () => {
    const newUser = {
      username: 'NewUser1',
      password: 'NewPassword1'
    };

    it('should create user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);
    });

    it('should return 400 if username or password is invalid', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({})
        .expect(400);
    });

    it('should return 400 if user already exists', async () => {
      const oldResponse = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(201);

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(400);
    });
  });

  describe('GET /api/users/timeline', () => {
    it('should return logged-in user\'s timeline scratches', async () => {
      const response = await request(app)
        .get('/api/users/timeline')
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }
    });

    it('should limit timeline scratches when specified', async () => {
      const limit = 1;
      const response = await request(app)
        .get(`/api/users/timeline?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');

      expect(response.body.scratches.length).toBe(limit);

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }
    });

    it('should skip over timeline scratches when specified', async () => {
      const limit = 2;
      const response = await request(app)
        .get(`/api/users/timeline?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body.scratches.length).toBe(limit);

      const after = response.body.scratches[0].id;

      const nextResponse = await request(app)
        .get(`/api/users/timeline?limit=1&after=${after}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(nextResponse.body.scratches[0]).toEqual(response.body.scratches[1]);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get('/api/users/timeline')
        .expect(401);
    });
  });

  describe('GET /api/users/search', () => {
    it('should return users', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');

      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should limit returned users when specified', async () => {
      const limit = 1;
      const response = await request(app)
        .get(`/api/users/search?limit=${limit}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');

      expect(response.body.users.length).toBe(limit);

      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should skip over users when specified', async () => {
      const limit = 2;
      const response = await request(app)
        .get(`/api/users/search?limit=${limit}`)
        .expect(200);

      expect(response.body.users.length).toBe(limit);

      const after = response.body.users[0].username;

      const nextResponse = await request(app)
        .get(`/api/users/search?limit=1&after=${after}`)
        .expect(200);

      expect(nextResponse.body.users[0]).toEqual(response.body.users[1]);
    });
  });

  describe('GET /api/users/suggested-users', () => {
    it('should return users', async () => {
      const response = await request(app)
        .get('/api/users/suggested-users')
        .expect(200);

      for (const user of response.body) {
        testUserProperties(user);
      }
    });
  });

  describe('GET /api/users/username/:username', () => {
    it('should return user', async () => {
      const username = 'testUser1';
      const response = await request(app)
        .get(`/api/users/username/${username}`)
        .expect(200);

      testUserProperties(response.body);
      expect(response.body.username).toBe(username);
    });

    it('should return 404 if user does not exist', async () => {
      const username = 'user';
      const response = await request(app)
        .get(`/api/users/username/${username}`)
        .expect(404);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user', async () => {
      const id = 1;
      const response = await request(app)
        .get(`/api/users/${id}`)
        .expect(200);

      testUserProperties(response.body);
      expect(response.body.id).toBe(id);
    });

    it('should return 404 if user does not exist', async () => {
      const id = 1e9;
      const response = await request(app)
        .get(`/api/users/${id}`)
        .expect(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    const id = 1;
    const updatedUserData = {
      name: 'updated user name',
      description: 'updated user description'
    };

    it('should update user', async () => {
      const response = await request(app)
        .patch(`/api/users/${id}`)
        .send(updatedUserData)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .patch(`/api/users/${id}`)
        .send(updatedUserData)
        .expect(401);
    });

    it('should return 401 if id does not match logged-in user', async () => {
      const differentId = 2;
      const response = await request(app)
        .patch(`/api/users/${differentId}`)
        .send(updatedUserData)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(401);
    });

    it('should return 400 if no user data is provided', async () => {
      const response = await request(app)
        .patch(`/api/users/${id}`)
        .send({})
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    const id = 1;

    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${id}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/users/${id}`)
        .expect(401);
    });

    it('should return 401 if id does not match logged-in user', async () => {
      const differentId = 2;
      const response = await request(app)
        .delete(`/api/users/${differentId}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(401);
    });
  });

  describe('GET /api/users/:id/timeline', () => {
    const id = 1;

    it('should return user\'s timeline scratches', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/timeline`)
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }
    });

    it('should limit timeline scratches when specified', async () => {
      const limit = 1;
      const response = await request(app)
        .get(`/api/users/${id}/timeline?limit=${limit}`)
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');

      expect(response.body.scratches.length).toBe(limit);

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }
    });

    it('should skip over timeline scratches when specified', async () => {
      const limit = 2;
      const response = await request(app)
        .get(`/api/users/${id}/timeline?limit=${limit}`)
        .expect(200);

      expect(response.body.scratches.length).toBe(limit);

      const after = response.body.scratches[0].id;

      const nextResponse = await request(app)
        .get(`/api/users/${id}/timeline?limit=1&after=${after}`)
        .expect(200);

      expect(nextResponse.body.scratches[0]).toEqual(response.body.scratches[1]);
    });
  });

  describe('GET /api/users/:id/followers', () => {
    const id = 1;

    it('should return users following logged-in user', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/followers`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      for (const user of response.body) {
        testUserProperties(user);
      }
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/followers`)
        .expect(401);
    });
  });

  describe('GET /api/users/:id/followed', () => {
    const id = 1;

    it('should return users followed by logged-in user', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/followed`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      for (const user of response.body) {
        testUserProperties(user);
      }
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/followed`)
        .expect(401);
    });
  });

  describe('POST /api/users/:id/follow', () => {
    const id = 3;

    it('should follow user', async () => {
      const response = await request(app)
        .post(`/api/users/${id}/follow`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post(`/api/users/${id}/follow`)
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id/follow', () => {
    const id = 2;

    it('should unfollow user', async () => {
      const response = await request(app)
        .delete(`/api/users/${id}/follow`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/users/${id}/follow`)
        .expect(401);
    });
  });

  describe('GET /api/users/:id/bookmarks', () => {
    const id = 1;

    it('should return user\'s bookmarks', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/bookmarks`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      for (const scratch of response.body) {
        testScratchProperties(scratch);
      }
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/bookmarks`)
        .expect(401);
    });

    it('should return 401 if id does not match logged-in user', async () => {
      const differentId = 2;
      const response = await request(app)
        .get(`/api/users/${differentId}/bookmarks`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(401);
    });
  });

  describe('GET /api/users/:id/likes', () => {
    const id = 1;

    it('should return user\'s likes', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/likes`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      for (const scratch of response.body) {
        testScratchProperties(scratch);
      }
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/users/${id}/likes`)
        .expect(401);
    });
  });
});