-- dogfish schema dump


--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.2
-- Dumped by pg_dump version 9.6.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: renamed_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE renamed_events (
    sequence_number integer NOT NULL,
    type text NOT NULL,
    entity_uid uuid NOT NULL,
    entity_version integer NOT NULL,
    data jsonb,
    "timestamp" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: renamed_events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE renamed_events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: renamed_events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE renamed_events_sequence_number_seq OWNED BY renamed_events.sequence_number;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE schema_migrations (
    migration_id character varying(128) NOT NULL
);


--
-- Name: renamed_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY renamed_events ALTER COLUMN sequence_number SET DEFAULT nextval('renamed_events_sequence_number_seq'::regclass);


--
-- Name: renamed_events renamed_events_entity_uid_entity_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY renamed_events
    ADD CONSTRAINT renamed_events_entity_uid_entity_version_unique UNIQUE (entity_uid, entity_version);


--
-- Name: renamed_events renamed_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY renamed_events
    ADD CONSTRAINT renamed_events_pkey PRIMARY KEY (sequence_number);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (migration_id);


--
-- PostgreSQL database dump complete
--



-- Schema dump done. Now dumping migration tracking table:


--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.2
-- Dumped by pg_dump version 9.6.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET search_path = public, pg_catalog;

--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO schema_migrations VALUES ('20171121094501');


--
-- PostgreSQL database dump complete
--

