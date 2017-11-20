-- dogfish schema dump


--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.3
-- Dumped by pg_dump version 9.6.3

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


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE events (
    sequence_number integer NOT NULL,
    type text NOT NULL,
    entity_uid uuid NOT NULL,
    entity_version integer NOT NULL,
    data jsonb,
    "timestamp" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: events_sequence_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE events_sequence_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_sequence_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE events_sequence_number_seq OWNED BY events.sequence_number;


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
-- Name: events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY events ALTER COLUMN sequence_number SET DEFAULT nextval('events_sequence_number_seq'::regclass);


--
-- Name: renamed_events sequence_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY renamed_events ALTER COLUMN sequence_number SET DEFAULT nextval('renamed_events_sequence_number_seq'::regclass);


--
-- Name: events events_entity_uid_entity_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_entity_uid_entity_version_unique UNIQUE (entity_uid, entity_version);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (sequence_number);


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

-- Dumped from database version 9.6.3
-- Dumped by pg_dump version 9.6.3

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

INSERT INTO schema_migrations VALUES ('20160205105236');
INSERT INTO schema_migrations VALUES ('20160205105241');
INSERT INTO schema_migrations VALUES ('20160210113458');
INSERT INTO schema_migrations VALUES ('20160215130204');
INSERT INTO schema_migrations VALUES ('20160225091855');
INSERT INTO schema_migrations VALUES ('20160316113812');
INSERT INTO schema_migrations VALUES ('20160428000203');
INSERT INTO schema_migrations VALUES ('20160504213836');
INSERT INTO schema_migrations VALUES ('20160504233423');
INSERT INTO schema_migrations VALUES ('20160524230419');
INSERT INTO schema_migrations VALUES ('20160608090815');
INSERT INTO schema_migrations VALUES ('20160620140537');
INSERT INTO schema_migrations VALUES ('20160914113850');
INSERT INTO schema_migrations VALUES ('20161110235143');
INSERT INTO schema_migrations VALUES ('20170207112535');
INSERT INTO schema_migrations VALUES ('20170727114908');
INSERT INTO schema_migrations VALUES ('20170802091510');
INSERT INTO schema_migrations VALUES ('20170802113957');
INSERT INTO schema_migrations VALUES ('20171012161846');


--
-- PostgreSQL database dump complete
--

