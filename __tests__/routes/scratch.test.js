const request = require('supertest');
const app = require('../../app');

describe('Scratch API', () => {
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

  describe('POST /api/scratches', () => {
    const newScratch = {
      body: 'new scratch'
    };

    it('should create scratch', async () => {
      const response = await request(app)
        .post('/api/scratches')
        .send(newScratch)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should create reply scratch', async () => {
      const replyRescratch = {
        body: 'new reply rescratch',
        parentId: 1
      };

      const response = await request(app)
        .post('/api/scratches')
        .send(replyRescratch)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should create direct rescratch', async () => {
      const directRescratch = {
        rescratchedId: 1
      };

      const response = await request(app)
        .post('/api/scratches')
        .send(directRescratch)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should create quote rescratch', async () => {
      const quoteRescratch = {
        body: 'new quote rescratch',
        rescratchedId: 1
      };

      const response = await request(app)
        .post('/api/scratches')
        .send(quoteRescratch)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post('/api/scratches')
        .send(newScratch)
        .expect(401);
    });

    it('should return 400 if no data is provided', async () => {
      const response = await request(app)
        .post('/api/scratches')
        .send({})
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(400);
    });
  });

  describe('GET /api/scratches/search', () => {
    it('should return scratches', async () => {
      const response = await request(app)
        .get('/api/scratches/search')
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');
      expect(response.body).toHaveProperty('extraScratches');

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }

      for (const scratch of Object.values(response.body.extraScratches)) {
        testScratchProperties(scratch);
      }
    });

    it('should limit returned scratches when specified', async () => {
      const limit = 1;
      const response = await request(app)
        .get(`/api/scratches/search?limit=${limit}`)
        .expect(200);

      expect(response.body).toHaveProperty('scratches');
      expect(response.body).toHaveProperty('isFinished');
      expect(response.body).toHaveProperty('extraScratches');

      expect(response.body.scratches.length).toBe(limit);

      for (const scratch of response.body.scratches) {
        testScratchProperties(scratch);
      }

      for (const scratch of Object.values(response.body.extraScratches)) {
        testScratchProperties(scratch);
      }
    });

    it('should skip over scratches when specified', async () => {
      const limit = 2;
      const response = await request(app)
        .get(`/api/scratches/search?limit=${limit}`)
        .expect(200);

      expect(response.body.scratches.length).toBe(limit);

      const after = response.body.scratches[0].id;

      const nextResponse = await request(app)
        .get(`/api/scratches/search?limit=1&after=${after}`)
        .expect(200);

      expect(nextResponse.body.scratches[0]).toEqual(response.body.scratches[1]);
    });
  });

  describe('GET /api/scratches/:id', () => {
    it('should return scratch', async () => {
      const id = 1;
      const response = await request(app)
        .get(`/api/scratches/${id}`)
        .expect(200);

      expect(response.body).toHaveProperty('scratch');
      expect(response.body).toHaveProperty('extraScratches');

      testScratchProperties(response.body.scratch);
      expect(response.body.scratch.id).toBe(id);

      for (const scratch of Object.values(response.body.extraScratches)) {
        testScratchProperties(scratch);
      }
    });

    it('should return 404 if scratch does not exist', async () => {
      const id = 1e9;
      const response = await request(app)
        .get(`/api/scratch/${id}`)
        .expect(404);
    });
  });

  describe('DELETE /api/scratches/:id', () => {
    const id = 1;

    it('should delete scratch', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}`)
        .expect(401);
    });

    it('should return 401 if scratch author does not match logged-in user', async () => {
      const differentId = 2;
      const response = await request(app)
        .delete(`/api/scratches/${differentId}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(401);
    });
  });

  describe('GET /api/scratches/:id/conversation', () => {
    it('should return scratch, parent chain and replies', async () => {
      const id = 2;
      const response = await request(app)
        .get(`/api/scratches/${id}/conversation`)
        .expect(200);

      expect(response.body).toHaveProperty('parentChain');
      expect(response.body).toHaveProperty('scratch');
      expect(response.body).toHaveProperty('replies');
      expect(response.body).toHaveProperty('extraScratches');

      for (const scratch of response.body.parentChain) {
        testScratchProperties(scratch);
      }

      testScratchProperties(response.body.scratch);
      expect(response.body.scratch.id).toBe(id);

      for (const scratch of response.body.replies) {
        testScratchProperties(scratch);
      }

      for (const scratch of Object.values(response.body.extraScratches)) {
        testScratchProperties(scratch);
      }
    });

    it('should return 404 if scratch does not exist', async () => {
      const id = 1e9;
      const response = await request(app)
        .get(`/api/scratches/${id}/conversation`)
        .expect(404);
    });
  });

  describe('DELETE /api/scratches/:id/direct-rescratch', () => {
    const id = 2;

    it('should delete direct rescratch', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/direct-rescratch`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/direct-rescratch`)
        .expect(401);
    });

    it('should return 404 if logged-in user does not have a direct rescratch', async () => {
      const differentId = 1;
      const response = await request(app)
        .delete(`/api/scratches/${differentId}/direct-rescratch`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(404);
    });
  });

  describe('GET /api/scratches/:id/rescratches', () => {
    const id = 4;

    it('should return users who have shared the scratch', async () => {
      const response = await request(app)
        .get(`/api/scratches/${id}/rescratches`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');
  
      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should limit users who shared scratch when specified', async ()=>{
      const limit = 1;
      const response = await request(app)
        .get(`/api/scratches/${id}/rescratches?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');

      expect(response.body.users.length).toBe(limit);

      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should skip over users who shared scratch when specified', async()=>{
      const limit = 2;
      const response = await request(app)
        .get(`/api/scratches/${id}/rescratches?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body.users.length).toBe(limit);

      const after = response.body.users[0].id;

      const nextResponse = await request(app)
        .get(`/api/scratches/${id}/rescratches?limit=1&after=${after}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(nextResponse.body.users[0]).toEqual(response.body.users[1]);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/scratches/${id}/rescratches`)
        .expect(401);
    });
  });

  describe('POST /api/scratches/:id/pin', () => {
    const id = 1;

    it('should pin scratch', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/pin`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/pin`)
        .expect(401);
    });

    it('should return 401 if scratch author does not match logged-in user', async () => {
      const differentId = 2;
      const response = await request(app)
        .post(`/api/scratches/${differentId}/pin`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(401);
    });

    it('should return 404 if scratch does not exist', async () => {
      const notFoundId = 1e9;
      const response = await request(app)
        .post(`/api/scratches/${notFoundId}/pin`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(404);
    });
  });

  describe('POST /api/scratches/:id/unpin', () => {
    const id = 4;

    it('should unpin scratch', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/unpin`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/unpin`)
        .expect(401);
    });
  });

  describe('POST /api/scratches/:id/bookmark', () => {
    const id = 1;

    it('should bookmark scratch', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/bookmark`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/bookmark`)
        .expect(401);
    });

    it('should return 404 if scratch does not exist', async () => {
      const notFoundId = 1e9;
      const response = await request(app)
        .post(`/api/scratches/${notFoundId}/bookmark`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(404);
    });
  });

  describe('DELETE /api/scratches/:id/bookmark', () => {
    const id = 2;

    it('should unbookmark scratch', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/bookmark`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/bookmark`)
        .expect(401);
    });
  });

  describe('GET /api/scratches/:id/likes', () => {
    const id = 1;

    it('should return users who have liked the scratch', async () => {
      const response = await request(app)
        .get(`/api/scratches/${id}/likes`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');  

      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should limit users who liked scratch when specified', async ()=>{
      const limit = 1;
      const response = await request(app)
        .get(`/api/scratches/${id}/likes?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('isFinished');

      expect(response.body.users.length).toBe(limit);

      for (const user of response.body.users) {
        testUserProperties(user);
      }
    });

    it('should skip over users who liked scratch when specified', async()=>{
      const limit = 2;
      const response = await request(app)
        .get(`/api/scratches/${id}/likes?limit=${limit}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(response.body.users.length).toBe(limit);

      const after = response.body.users[0].id;

      const nextResponse = await request(app)
        .get(`/api/scratches/${id}/likes?limit=1&after=${after}`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);

      expect(nextResponse.body.users[0]).toEqual(response.body.users[1]);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .get(`/api/scratches/${id}/likes`)
        .expect(401);
    });
  });

  describe('POST /api/scratches/:id/likes', () => {
    const id = 1;

    it('should like scratch', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/likes`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(201);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .post(`/api/scratches/${id}/likes`)
        .expect(401);
    });

    it('should return 404 if scratch does not exist', async () => {
      const notFoundId = 1e9;
      const response = await request(app)
        .post(`/api/scratches/${notFoundId}/likes`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(404);
    });
  });

  describe('DELETE /api/scratches/:id/likes', () => {
    const id = 2;

    it('should unlike scratch', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/likes`)
        .set('Authorization', 'Bearer ' + accessToken)
        .expect(200);
    });

    it('should return 401 if no access token is provided', async () => {
      const response = await request(app)
        .delete(`/api/scratches/${id}/likes`)
        .expect(401);
    });
  });
});