/**
 * Unit tests required to assert controller and service functionality
 * -> Controller:
 *      -> Should test correct access to the route
 *          -> Expecting to call the correct function from the correct service.
 *          -> Expecting to receive a 200 status.
 *      -> Should test data validation
 *          -> Expects body or parameters to be correct.
 *          -> Expects to receive a 400 status.
 * -> Service:
 *      -> Should test correct user access.
 *          -> Expect to receive a denied access if user is not authorized.
 *          -> Expect to call next function.       
 *      -> Should test data validation
 *          -> Expects body to be correct. 
 *      -> Should test to recieve the correct data from repo.
 */

 /**
  * Integration tests to assert repository functionality
  */

import request from 'supertest';
import { createApp } from '../../server';

describe('routes', () => {

    /**
     * CRUD create a proposal
     */

    it('should create a proposal', () => {

    });

    it('should receive a proposal from client.', () => {

    });
    
    it('should return error if a proposal is not received.', () => {

    });

    /**
     * CRUD create and propose a proposal
     */
    
    it('should create and propose a proposal', () => {

    });

    it('should receive a proposal and a new perspective data array from client.', () => {

    });
    
    it('should return error if neither a proposal or new perspective data is not received.', () => {

    });

    /**
     * CRUD get a proposal
     */

    it('should get a proposal',() => {

    });

    /**
     * CRUD update a proposal
     */

    it('should update a proposal', () => {

    });

    it('should receive the updates array', () => {

    });

    it('should return error if the updates array is not received', () => {

    });

    /**
     * CRUD accept a proposal
     */

    it('should accept a proposal', () => {

    });

    /**
     * CRUD accept a proposal
     */

    it('should cancel a proposal', () => {

    });

    /**
     * CRUD accept a proposal
     */

    it('should decline a proposal', () => {

    });

});

describe('services', () => {

});

describe('repository', () => {

});