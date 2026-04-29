"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEstablishment = exports.getEstablishments = void 0;
const Establishment_1 = require("../models/Establishment");
const getEstablishments = async (req, res) => {
    try {
        const establishments = await Establishment_1.Establishment.find({ is_active: true }).sort({ name: 1 });
        res.status(200).json(establishments);
    }
    catch (error) {
        console.error('getEstablishments error:', error);
        res.status(500).json({ message: 'Error retrieving establishments' });
    }
};
exports.getEstablishments = getEstablishments;
const createEstablishment = async (req, res) => {
    try {
        const { name, address, city, state, nature_of_business, contact_person, contact_phone, contact_email } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Establishment name is required' });
        }
        const newEstablishment = await Establishment_1.Establishment.create({
            name, address, city, state, nature_of_business, contact_person, contact_phone, contact_email
        });
        res.status(201).json({ message: 'Establishment created successfully', establishment: newEstablishment });
    }
    catch (error) {
        console.error('createEstablishment error:', error);
        res.status(500).json({ message: 'Error creating establishment' });
    }
};
exports.createEstablishment = createEstablishment;
